# DP LMW

Hệ thống lưu trữ ảnh/video kỷ niệm dùng chung (không cần tài khoản), hỗ trợ gộp album thủ công và tự động (theo ngày/địa điểm chụp). Xem, tải lên, chỉnh sửa album không cần đăng nhập — chỉ **xóa** mới yêu cầu đăng nhập quản trị.

**Đang chạy thật**: https://dp-lmw-fe.vercel.app (backend: https://dp-lmw-be.onrender.com) — repo: https://github.com/Absinthe-Gin/dp-lmw

Monorepo npm workspaces, tách riêng frontend / backend / logic AI. Chi tiết kiến trúc, quy ước code, lệnh chạy: xem [CLAUDE.md](./CLAUDE.md).

## Cấu trúc thư mục

```
fe/                  Next.js — UI thuần, gọi API của be/ qua fetch
be/                  Express + Prisma — REST API, auth, upload, orchestration
ai/                  Logic AI/thông minh, tách khỏi mã nghiệp vụ be/
packages/shared/     Type dùng chung giữa fe/ và be/ (hợp đồng API)
```

Xem CLAUDE.md để biết chi tiết từng thư mục con và trách nhiệm của từng route/module.

## Chạy trên local (sau khi clone repo)

Hướng dẫn dưới đây chỉ cần Node.js + một Postgres bất kỳ — không phụ thuộc vào backend/database cụ thể nào của bản deploy thật (xem mục "Deploy" bên dưới nếu tò mò production dùng gì).

**Yêu cầu:**
- Node.js 18+ và npm
- Một Postgres bất kỳ để chạy `be/` (cài local, Docker, hay dịch vụ cloud miễn phí nào cũng được — repo không ràng buộc nhà cung cấp cụ thể)

**Các bước:**

```bash
git clone https://github.com/Absinthe-Gin/dp-lmw.git
cd dp-lmw
npm install

# Tạo file env từ mẫu rồi tự điền giá trị của bạn
cp be/.env.example be/.env
cp fe/.env.example fe/.env
```

Trong `be/.env`, điền tối thiểu:
- `DATABASE_URL` — trỏ vào Postgres của bạn (local hoặc cloud tùy bạn chọn)
- `ADMIN_PASSWORD`, `JWT_SECRET` — tự đặt giá trị bất kỳ để test đăng nhập quản trị
- `STORAGE_DRIVER="local"` — để lưu file thẳng vào `be/uploads/` trên máy, **không cần** tài khoản/dịch vụ lưu trữ đám mây nào để chạy thử (chỉ khi muốn dùng storage kiểu S3 thật thì mới cần điền thêm các biến `STORAGE_*` còn lại)

`fe/.env` chỉ cần đúng 1 biến, giá trị mặc định trong file mẫu đã đúng cho local (`NEXT_PUBLIC_API_URL="http://localhost:4000"`).

Sau đó:

```bash
npm run build -w ai -w packages/shared   # build các package nội bộ trước
npm run -w be prisma:generate             # bắt buộc — xem lưu ý trong CLAUDE.md
npm run -w be prisma:migrate              # tạo schema trên Postgres của bạn
npm run -w be prisma:seed                 # (tuỳ chọn) tạo 4 ảnh mẫu để test tính năng gộp album

npm run dev:be     # http://localhost:4000
npm run dev:fe      # http://localhost:3000
```

Mở http://localhost:3000 — xong. Chi tiết đầy đủ về schema, index, migration, các biến env còn lại: xem mục "Database" và "Commands" trong [CLAUDE.md](./CLAUDE.md).


## Deploy

Đã deploy thật, miễn phí hoàn toàn:

- **fe/**: Vercel — https://dp-lmw-fe.vercel.app (Root Directory = `fe`, env `NEXT_PUBLIC_API_URL` trỏ vào Render)
- **be/**: Render free web service — https://dp-lmw-be.onrender.com (deploy qua `render.yaml` ở gốc repo, tự sleep sau 15 phút không hoạt động, request đầu chậm ~30-50s sau đó)
- **DB**: Supabase Postgres
- **Storage**: Supabase Storage (S3-compatible); có thể đổi sang Cloudflare R2 sau nếu vượt free tier — cùng code, chỉ đổi `STORAGE_*` trong env

Push lên nhánh `main` sẽ tự động deploy lại cả hai. Riêng khi sửa `buildCommand` trong `render.yaml`, cần vào Render dashboard bấm **Manual Sync** ở trang Blueprint (không phải Manual Deploy ở trang service) để áp dụng — chi tiết xem CLAUDE.md.
