// ipns-refresh hands the newest record of an IPNS name to the DHT peers that are
// nearest to it.
//
// A publisher stores a new record on the peers it happens to find nearest to the
// name. Peers it misses keep the previous record until it expires a day later,
// and gateways that ask them serve the previous release. This tool crawls the
// whole DHT to know the nearest peers for certain, asks each one for its record,
// picks the newest valid one and stores it on every peer that lacks it.
//
// The record is signed by the publisher, so passing it on changes nothing about
// its content, and a peer only replaces a record with a higher sequence number.
package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"sort"
	"sync"
	"time"

	"github.com/ipfs/boxo/ipns"
	"github.com/libp2p/go-libp2p"
	dht "github.com/libp2p/go-libp2p-kad-dht"
	"github.com/libp2p/go-libp2p-kad-dht/crawler"
	pb "github.com/libp2p/go-libp2p-kad-dht/pb"
	kb "github.com/libp2p/go-libp2p-kbucket"
	recpb "github.com/libp2p/go-libp2p-record/pb"
	"github.com/libp2p/go-libp2p/core/host"
	"github.com/libp2p/go-libp2p/core/network"
	"github.com/libp2p/go-libp2p/core/peer"
	"github.com/libp2p/go-libp2p/core/peerstore"
	"github.com/libp2p/go-msgio"
	"google.golang.org/protobuf/proto"
)

var (
	nameFlag = flag.String("name", "", "IPNS name (k51...)")
	nearest  = flag.Int("nearest", 60, "how many of the nearest peers to keep up to date")
	after    = flag.String("published-after", "", "wait for a record published after this time (RFC 3339)")
	lifetime = flag.Duration("lifetime", 24*time.Hour, "how long the publisher makes its records valid")
	waitFor  = flag.Duration("wait", 12*time.Minute, "how long to wait for that record")
	dryRun   = flag.Bool("dry-run", false, "only report what the peers hold")
)

type holding struct {
	id    peer.ID
	raw   []byte
	seq   uint64
	until time.Time
	err   error
}

func main() {
	flag.Parse()
	name, err := ipns.NameFromString(*nameFlag)
	must(err)
	key := string(name.RoutingKey())

	var since time.Time
	if *after != "" {
		since, err = time.Parse(time.RFC3339, *after)
		must(err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 40*time.Minute)
	defer cancel()

	h, err := libp2p.New(
		libp2p.ListenAddrStrings("/ip4/0.0.0.0/tcp/0", "/ip4/0.0.0.0/udp/0/quic-v1"),
		// A crawl opens thousands of connections; the default limits would refuse most.
		libp2p.ResourceManager(&network.NullResourceManager{}),
	)
	must(err)
	defer h.Close()

	peers := crawl(ctx, h)
	near := kb.SortClosestPeers(peers, kb.ConvertKey(key))
	// Some peers answered the crawler and then went away; ask a few more than needed.
	near = near[:min(len(near), *nearest+*nearest/2)]

	pm, err := pb.NewProtocolMessenger(&kadSender{h: h})
	must(err)

	deadline := time.Now().Add(*waitFor)
	var held []holding
	var best holding
	for {
		held = ask(ctx, pm, name, key, near)
		best = newest(held)
		published := best.until.Add(-*lifetime)
		if since.IsZero() || published.After(since) {
			break
		}
		if time.Now().After(deadline) {
			fmt.Printf("no record published after %s showed up; newest is seq %d from %s\n", since.Format(time.RFC3339), best.seq, published.Format(time.RFC3339))
			break
		}
		fmt.Printf("newest is seq %d from %s, waiting for the new release\n", best.seq, published.Format(time.RFC3339))
		time.Sleep(20 * time.Second)
	}

	report(held, best)
	if best.raw == nil || *dryRun {
		if best.raw == nil {
			os.Exit(1)
		}
		return
	}

	// Keep the nearest reachable peers up to date, and only those: a lookup for the
	// name ends among them.
	rec := &recpb.Record{Key: []byte(key), Value: best.raw}
	var targets []holding
	for _, x := range held {
		if x.err == nil && len(targets) < *nearest {
			targets = append(targets, x)
		}
	}
	var mu sync.Mutex
	var wg sync.WaitGroup
	stored, failed, current := 0, 0, 0
	for _, x := range targets {
		if x.raw != nil && x.seq >= best.seq {
			current++
			continue
		}
		wg.Add(1)
		go func(p peer.ID) {
			defer wg.Done()
			c, cc := context.WithTimeout(ctx, 20*time.Second)
			defer cc()
			err := pm.PutValue(c, p, rec)
			mu.Lock()
			defer mu.Unlock()
			if err != nil {
				failed++
			} else {
				stored++
			}
		}(x.id)
	}
	wg.Wait()
	fmt.Printf("seq %d: already on %d of the %d nearest reachable peers, stored on %d, %d refused\n", best.seq, current, len(targets), stored, failed)
}

// crawl walks the whole DHT and returns every peer that answered.
func crawl(ctx context.Context, h host.Host) []peer.ID {
	c, err := crawler.NewDefaultCrawler(h, crawler.WithParallelism(300), crawler.WithConnectTimeout(8*time.Second), crawler.WithMsgTimeout(8*time.Second))
	must(err)
	var mu sync.Mutex
	var ok []peer.ID
	failed := 0
	start := time.Now()
	seeds := []*peer.AddrInfo{}
	for _, ai := range dht.GetDefaultBootstrapPeerAddrInfos() {
		seeds = append(seeds, &ai)
	}
	c.Run(ctx, seeds, func(p peer.ID, rtPeers []*peer.AddrInfo) {
		mu.Lock()
		ok = append(ok, p)
		mu.Unlock()
		for _, ai := range rtPeers {
			h.Peerstore().AddAddrs(ai.ID, ai.Addrs, peerstore.PermanentAddrTTL)
		}
	}, func(peer.ID, error) {
		mu.Lock()
		failed++
		mu.Unlock()
	})
	fmt.Printf("crawled the DHT in %s: %d peers answered, %d did not\n", time.Since(start).Round(time.Second), len(ok), failed)
	return ok
}

// ask fetches the record each peer holds.
func ask(ctx context.Context, pm *pb.ProtocolMessenger, name ipns.Name, key string, peers []peer.ID) []holding {
	out := make([]holding, len(peers))
	var wg sync.WaitGroup
	for i, p := range peers {
		wg.Add(1)
		go func(i int, p peer.ID) {
			defer wg.Done()
			c, cc := context.WithTimeout(ctx, 20*time.Second)
			defer cc()
			x := holding{id: p}
			rec, _, err := pm.GetValue(c, p, key)
			if err != nil {
				x.err = err
			} else if rec != nil && len(rec.GetValue()) > 0 {
				if r, err := ipns.UnmarshalRecord(rec.GetValue()); err == nil && ipns.ValidateWithName(r, name) == nil {
					x.raw = rec.GetValue()
					x.seq, _ = r.Sequence()
					x.until, _ = r.Validity()
				}
			}
			out[i] = x
		}(i, p)
	}
	wg.Wait()
	return out
}

func newest(held []holding) holding {
	var best holding
	for _, x := range held {
		if x.raw != nil && (best.raw == nil || x.seq > best.seq || x.seq == best.seq && x.until.After(best.until)) {
			best = x
		}
	}
	return best
}

func report(held []holding, best holding) {
	counts := map[string]int{}
	for _, x := range held {
		switch {
		case x.err != nil:
			counts["unreachable"]++
		case x.raw == nil:
			counts["no record"]++
		default:
			counts[fmt.Sprintf("seq %d", x.seq)]++
		}
	}
	keys := make([]string, 0, len(counts))
	for k := range counts {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	fmt.Printf("records on the %d nearest peers:", len(held))
	for _, k := range keys {
		fmt.Printf(" %s x%d,", k, counts[k])
	}
	fmt.Println()
	if best.raw != nil {
		fmt.Printf("newest: seq %d, valid until %s\n", best.seq, best.until.Format(time.RFC3339))
	}
}

// kadSender sends one DHT request per stream, a length-prefixed protobuf each way.
type kadSender struct{ h host.Host }

func (k *kadSender) SendRequest(ctx context.Context, p peer.ID, m *pb.Message) (*pb.Message, error) {
	s, err := k.h.NewStream(ctx, p, "/ipfs/kad/1.0.0")
	if err != nil {
		return nil, err
	}
	defer s.Close()
	if dl, ok := ctx.Deadline(); ok {
		s.SetDeadline(dl)
	}
	b, err := proto.Marshal(m)
	if err != nil {
		return nil, err
	}
	if err := msgio.NewVarintWriter(s).WriteMsg(b); err != nil {
		return nil, err
	}
	raw, err := msgio.NewVarintReaderSize(s, 4<<20).ReadMsg()
	if err != nil {
		return nil, err
	}
	out := new(pb.Message)
	return out, proto.Unmarshal(raw, out)
}

func (k *kadSender) SendMessage(ctx context.Context, p peer.ID, m *pb.Message) error {
	_, err := k.SendRequest(ctx, p, m)
	return err
}

func must(err error) {
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
