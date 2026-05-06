import { Toaster } from 'react-hot-toast';

export default function App() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
      <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
        👟 Sneaker Drop — Loading...
      </h1>
      <Toaster position="top-right" />
    </div>
  );
}
