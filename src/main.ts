import { mount } from 'svelte';
import './app.css';
import './lib/os/apps';
import App from './App.svelte';
import { startOffline } from './lib/os/offline.svelte';

startOffline();
mount(App, { target: document.getElementById('app')! });
