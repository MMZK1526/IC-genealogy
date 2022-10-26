import './index.css';

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App/App';
import {App2} from './App2';

// @ts-ignore
createRoot(document.getElementById('root')!).render(<App2 />);
