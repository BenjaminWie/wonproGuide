import { loadEnv } from 'vite';
process.env.MY_SECRET = 'hello';
console.log(loadEnv('development', '.', '').MY_SECRET);
