import { mount } from 'svelte';
import './app.css';
import './lib/os/apps';
import App from './App.svelte';
import { startOffline } from './lib/os/offline.svelte';
import { lang } from './lib/os/i18n';
import { startPack } from './lib/os/pack.svelte';

document.documentElement.lang = lang;
startOffline();
startPack();
mount(App, { target: document.getElementById('app')! });
