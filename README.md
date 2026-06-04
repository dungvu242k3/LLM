# LLM Evaluation Dashboard

Hệ thống đánh giá và so sánh hiệu năng các mô hình ngôn ngữ lớn (LLM) đa nhiệm chuyên sâu, hỗ trợ kiểm thử song song các mô hình hàng đầu (như GPT-5.5, Claude 4.8, Gemini 3.5, DeepSeek V4, Llama 4) trên bộ dữ liệu tiêu chuẩn từ dễ đến khó.

Dự án bao gồm 2 phần chính:
*   **Backend:** FastAPI (Python), SQLite (Cơ sở dữ liệu lưu trữ cấu hình, câu hỏi và kết quả).
*   **Frontend:** React, Vite, TypeScript, Tailwind CSS v4, Recharts (Biểu đồ phân tích trực quan).

---

## 🚀 Các Tính Năng Nổi Bật

1.  **Đa dạng mô hình (2026 Flagship SOTA)**: Hỗ trợ sẵn cấu hình cho các mô hình AI mới nhất của OpenAI, Google Gemini, Anthropic Claude, DeepSeek và Meta Llama chạy qua cổng tích hợp **9Router** hoặc API trực tiếp.
2.  **Cơ chế Failover OpenAI tự động**: 
    *   Hệ thống ưu tiên gọi API của OpenAI thông qua **9Router** để tối ưu hóa điều phối.
    *   Nếu 9Router gặp sự cố hoặc hết số dư, hệ thống tự động chuyển hướng gọi trực tiếp tới API OpenAI chính thống bằng khóa `OPENAI_API_KEY` dự phòng của bạn mà không làm gián đoạn bài test.
3.  **Bộ câu hỏi kiểm thử chuẩn hóa**: Tích hợp sẵn 45 câu hỏi chất lượng cao kế thừa từ các bộ benchmark uy tín như **GSM8K** (Toán logic), **MMLU** (Kiến thức chuyên ngành), **VMLU** (Văn hóa & Địa lý Việt Nam), **Vi-DROP** (Suy luận số lượng), cùng các bài test an toàn (Safety) và chống ảo tưởng (Hallucination).
4.  **Báo cáo so sánh trực quan (Radar & Bar Chart)**: So sánh trực quan thế mạnh đa chiều của các mô hình (Độ chính xác, Suy luận, Tốc độ phản hồi, Chi phí tiêu thụ token) trên biểu đồ Radar và biểu đồ Cột phân chia theo từng chủ đề.

---

## 🛠️ Yêu Cầu Hệ Thống

*   **Python:** Phiên bản 3.10 trở lên.
*   **Node.js:** Phiên bản 18.0 trở lên.
*   **Trình quản lý gói:** `npm` (đi kèm Node.js).

---

## ⚙️ Hướng Dẫn Setup & Chạy Dự Án

### 1. Setup Backend (FastAPI)

**Bước 1: Di chuyển vào thư mục backend và kích hoạt môi trường ảo**
```bash
cd backend
```
*   **Trên Windows (PowerShell):**
    ```powershell
    .venv\Scripts\Activate.ps1
    ```
*   **Trên Windows (Command Prompt):**
    ```cmd
    .venv\Scripts\activate.bat
    ```
*(Nếu chưa cài đặt thư viện hoặc muốn cài mới, chạy lệnh: `pip install -r requirements.txt`)*

**Bước 2: Cấu hình biến môi trường**
Sao chép file mẫu `.env.example` thành `.env`:
*   **Windows (PowerShell):** `Copy-Item .env.example .env`
*   **Windows (Command Prompt):** `copy .env.example .env`

Mở file `.env` bằng VS Code và điền các API Key của bạn:
```env
# Cấu hình 9Router (Cổng chính)
NINE_ROUTER_API_KEY=your_9router_key_here
NINE_ROUTER_BASE_URL=http://localhost:20128/v1

# Cấu hình OpenAI (Khóa dự phòng khi 9Router hết tiền)
OPENAI_API_KEY=your_openai_key_here

# Cấu hình Google Gemini & Anthropic Claude trực tiếp (Tùy chọn)
GEMINI_API_KEY=your_gemini_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
CLAUDE_API_KEY=your_claude_key_here

# Cấu hình mô hình làm giám khảo chấm điểm tự luận (LLM Judge)
JUDGE_PROVIDER=nine_router # Hoặc: openai, gemini
JUDGE_MODEL=gpt-4o-mini
```

**Bước 3: Khởi tạo Database và nạp dữ liệu mẫu (Seeding)**
Chạy script để khởi tạo file DB SQLite (`llm_eval.db`), tự động nạp 45 test case chuẩn từ dễ đến khó và danh sách 30 mô hình SOTA:
```bash
python app/seed.py
```

**Bước 4: Khởi chạy máy chủ Backend**
```bash
uvicorn app.main:app --reload
```
*Backend sẽ chạy tại địa chỉ mặc định:* `http://localhost:8000`

---

### 2. Setup Frontend (React + Vite)

Mở một terminal mới (song song với terminal Backend):

**Bước 1: Di chuyển vào thư mục frontend**
```bash
cd frontend
```

**Bước 2: Cài đặt các thư viện phụ thuộc**
```bash
npm install
```

**Bước 3: Khởi chạy máy chủ phát triển**
```bash
npm run dev
```
*Frontend sẽ chạy tại địa chỉ:* `http://localhost:5173`

---

## 💡 Hướng Dẫn Sử Dụng Trên Giao Diện

1.  **Trang Models:** Nơi quản lý danh sách mô hình. Hãy bật (Active) các mô hình bạn muốn dùng trong bài kiểm thử.
2.  **Trang Run Evaluation:**
    *   Điền tên đợt kiểm thử vào ô **Run Name**.
    *   Điều chỉnh độ sáng tạo câu trả lời (**Temperature**) và độ dài câu trả lời (**Max Tokens**).
    *   Chọn phương thức chấm điểm (**Evaluator**):
        *   `Rule-based` (So khớp đáp án chuẩn cứng - Nhanh & Miễn phí).
        *   `LLM Judge` (AI chấm điểm tự luận thông minh - Tốn phí API).
        *   `Both` (Kết hợp cả hai phương pháp).
    *   Tích chọn các mô hình cần đánh giá ở bảng bên phải.
    *   Bấm **Run Evaluation** và đợi hệ thống thực thi.
3.  **Trang Dashboard & Compare:** Xem các biểu đồ cột và biểu đồ mạng nhện so sánh điểm số, độ trễ và chi phí của từng model. Hệ thống sẽ tự động đưa ra khuyến nghị mô hình tốt nhất, nhanh nhất và rẻ nhất cho bạn.
4.  **Trang Results:** Xem chi tiết từng câu trả lời thực tế của các mô hình đối chiếu với đáp án chuẩn.
