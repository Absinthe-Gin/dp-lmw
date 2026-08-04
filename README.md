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

## Bắt đầu

Database và lưu trữ file đều chạy trên cloud (Supabase) — mọi người dùng cùng một dữ liệu thật, không phải bản sao riêng trên máy ai đó:
- **Database**: Supabase Postgres (project `tokosunpcsrcgqjjdwwz`, region `ap-southeast-1`)
- **Lưu ảnh/video**: Supabase Storage (bucket `DPLMW`), qua giao thức tương thích S3

```
npm install
cp be/.env.example be/.env   # điền DATABASE_URL (Supabase) + STORAGE_* (Supabase Storage) + ADMIN_PASSWORD + JWT secret
cp fe/.env.example fe/.env   # điền API URL
npm run build -w ai -w packages/shared   # build các package nội bộ trước
npm run -w be prisma:migrate                # chỉ cần khi đổi schema.prisma
npm run -w be prisma:seed                   # (tuỳ chọn) tạo 4 ảnh mẫu để test tính năng gộp album
npm run dev:be     # http://localhost:4000
npm run dev:fe      # http://localhost:3000
```

Nếu không có mạng hoặc muốn dev offline: đặt `STORAGE_DRIVER=local` (ghi file vào `be/uploads/`) và trỏ `DATABASE_URL` về một Postgres cục bộ — code hỗ trợ cả hai, chỉ đổi env. Chi tiết đầy đủ về schema, index, migration, backup: xem mục "Database" trong [CLAUDE.md](./CLAUDE.md).

## Thiết kế

Bản thiết kế giao diện (tông xanh dương/trắng, 4 màn hình chính): xem token màu/kiểu chữ trong `fe/src/app/globals.css` và `fe/tailwind.config.ts`.

## Deploy

Đã deploy thật, miễn phí hoàn toàn:

- **fe/**: Vercel — https://dp-lmw-fe.vercel.app (Root Directory = `fe`, env `NEXT_PUBLIC_API_URL` trỏ vào Render)
- **be/**: Render free web service — https://dp-lmw-be.onrender.com (deploy qua `render.yaml` ở gốc repo, tự sleep sau 15 phút không hoạt động, request đầu chậm ~30-50s sau đó)
- **DB**: Supabase Postgres
- **Storage**: Supabase Storage (S3-compatible); có thể đổi sang Cloudflare R2 sau nếu vượt free tier — cùng code, chỉ đổi `STORAGE_*` trong env

Push lên nhánh `main` sẽ tự động deploy lại cả hai. Riêng khi sửa `buildCommand` trong `render.yaml`, cần vào Render dashboard bấm **Manual Sync** ở trang Blueprint (không phải Manual Deploy ở trang service) để áp dụng — chi tiết xem CLAUDE.md.
