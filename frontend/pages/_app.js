import { Inter, Playfair_Display } from 'next/font/google';
import '../styles/globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });

export default function MyApp({ Component, pageProps }) {
  return (
    <div className={`${inter.variable} ${playfair.variable}`}>
      <Component {...pageProps} />
    </div>
  );
}

