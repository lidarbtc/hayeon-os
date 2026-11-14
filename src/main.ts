import { mount } from 'svelte';
import './app.css';
import './lib/os/apps';
import App from './App.svelte';

mount(App, { target: document.getElementById('app')! });
