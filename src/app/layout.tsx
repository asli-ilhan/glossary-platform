import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Providers from "./components/Providers";

export const metadata = {
  title: "Digital Literacy Toolkit",
  description: "An interactive platform for critically engaging with digital systems and power structures",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen">
        <Providers>
        <Header />
        <main className="flex-1">{children}</main> {/* Pushes footer down */}
        <Footer />
        </Providers>
      </body>
    </html>
  );
}
