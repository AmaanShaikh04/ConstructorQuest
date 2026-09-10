import "./globals.css";

export const metadata = {
  title: "Constructor Quest — Uni Games 2026",
  description:
    "A digital campus scavenger hunt for Constructor University's Uni Games 2026.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1C2541",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
