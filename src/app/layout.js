import './globals.css';

export const metadata = {
  title: 'Quản lý thiết bị CNTT - TTYT Liên Chiểu',
  description: 'Hệ thống quản lý vòng đời thiết bị CNTT tập trung của Trung tâm Y tế khu vực Liên Chiểu, Đà Nẵng.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
