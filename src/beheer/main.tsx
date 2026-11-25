import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/dm-sans/latin-700.css';
import '@fontsource/bricolage-grotesque/latin-600.css';
import '@fontsource/bricolage-grotesque/latin-700.css';
import '@fontsource/bricolage-grotesque/latin-800.css';
import '../styles.css';
import './beheer.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Beheer } from './Beheer';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Beheer />
  </StrictMode>,
);
