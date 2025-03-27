import { defineConfig } from 'vite';
import dns from 'node:dns';

dns.setDefaultResultOrder('verbatim');

export default defineConfig({
    appType: 'mpa',
    server: {
        port: 5173
    }
});