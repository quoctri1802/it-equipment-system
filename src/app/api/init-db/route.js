import { initDatabase } from '@/lib/db';

export async function GET(request) {
  try {
    await initDatabase();
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Cơ sở dữ liệu được khởi tạo thành công!' 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Lỗi khi khởi tạo database:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
