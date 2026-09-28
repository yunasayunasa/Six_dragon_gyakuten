import './style.css';
import { startDemo } from './demo/startDemo.js';
startDemo().catch((error) => { console.error(error); document.querySelector('#loading').textContent = `起動できませんでした: ${error.message}`; });
