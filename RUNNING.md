# Chạy dự án trên máy này (đã cấu hình sẵn)

File này dành riêng cho máy hiện tại — `be/.env` và `fe/.env` đã có sẵn giá trị thật (Supabase thật, không phải local rỗng). Muốn hướng dẫn tổng quát cho máy khác/clone mới, xem mục "Chạy trên local (sau khi clone repo)" trong [README.md](./README.md).

## Chạy nhanh (khi mọi thứ đã build sẵn — trường hợp thường gặp nhất)

Mở 2 terminal riêng (hoặc chạy nền), từ thư mục gốc `dplmw/`:

```bash
npm run dev:be      # backend  -> http://localhost:4000
npm run dev:fe      # frontend -> http://localhost:3000
```

Kiểm tra nhanh đã chạy đúng chưa:
```bash
curl http://localhost:4000/health        # {"ok":true}
curl -o /dev/null -w "%{http_code}\n" http://localhost:3000/   # 200
```

Mở trình duyệt: **http://localhost:3000**

## Nếu vừa clone lại / `node_modules` hoặc `dist/` chưa có

```bash
npm install
npm run build -w ai -w packages/shared    # bắt buộc — be/ cần bản dist của 2 package này
npm run -w be prisma:generate             # bắt buộc — tsc sẽ lỗi "any" nếu bỏ qua bước này
```

Rồi chạy `npm run dev:be` / `npm run dev:fe` như trên.

## Dừng server

Tìm PID đang giữ cổng rồi tắt (PowerShell):
```powershell
Get-NetTCPConnection -LocalPort 4000 -State Listen | Select OwningProcess
Get-NetTCPConnection -LocalPort 3000 -State Listen | Select OwningProcess
Stop-Process -Id <PID> -Force
```

## Sự cố hay gặp

- **Lỗi `EPERM ... query_engine-windows.dll.node` khi chạy `prisma generate`** — do backend dev server đang chạy giữ file khoá. Tắt server backend trước (xem trên), rồi generate lại.
- **fe báo `Cannot find module './xxx.js'` / trang trắng sau khi vừa chạy `npm run build`** — `.next` bị hỏng do build production đè lên lúc dev server đang chạy. Xoá `fe/.next` rồi khởi động lại `npm run dev:fe`.
- **Tích tụ nhiều tiến trình `node.exe` orphan sau nhiều lần restart (Windows)** — nếu nghi ngờ bị khoá file linh tinh, tắt sạch rồi chạy lại:
  ```powershell
  Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
  ```

## Dữ liệu đang trỏ tới đâu

`be/.env`'s `DATABASE_URL` và `STORAGE_*` trỏ thẳng vào **Supabase project thật** (cùng dữ liệu với bản production trên Vercel/Render) — không phải bản sao riêng. CRUD khi chạy local ở đây sẽ ảnh hưởng ngay tới dữ liệu thật mà người dùng production đang thấy. Cẩn thận khi test xoá/gộp hàng loạt — nên tạo dữ liệu test riêng rồi xoá sạch sau khi test xong, đừng thao tác trực tiếp trên ảnh/video/album thật.

## Thông tin thêm

- Kiến trúc, quy ước code, chi tiết từng route: [CLAUDE.md](./CLAUDE.md)
- Trạng thái deploy, việc còn tồn đọng: `.claude/skills/resume/SKILL.md` (gọi `/resume`)
