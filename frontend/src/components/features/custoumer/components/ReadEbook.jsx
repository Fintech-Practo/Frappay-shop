import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import pdfjsLib from "@/lib/pdfjs";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { API_BASE_URL } from "@/config/api";
import { useAuth } from "@/context/AuthContext";

export default function ReadEbook() {
  const { orderId, productId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const canvasRef = useRef(null);

  const [pdf, setPdf] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load PDF
  useEffect(() => {
    let cancelled = false;

    async function loadPdf() {
      try {
        if (!token) return;

        setLoading(true);
         const pdfUrl = `${API_BASE_URL}/api/orders/${orderId}/stream/${productId}`;
        console.log("Attempting to load PDF from URL:", pdfUrl);
        console.log("API_BASE_URL is:", API_BASE_URL);

        const loadingTask = pdfjsLib.getDocument({
          
          url: pdfUrl,
          httpHeaders: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: false,
        });

        const pdfDoc = await loadingTask.promise;
        if (cancelled) return;

        setPdf(pdfDoc);
        setNumPages(pdfDoc.numPages);
        setPageNum(1);
      } catch (err) {
        console.error("PDF load failed:", err);
        
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPdf();
    return () => (cancelled = true);
  }, [orderId, productId, token]);

  // Render page
  useEffect(() => {
    if (!pdf) return;

    async function renderPage() {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.4 });

      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport,
      }).promise;
    }

    renderPage();
  }, [pdf, pageNum]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center">
      {/* Header */}
      <div className="w-full flex items-center justify-between p-4 bg-card border-b border-border">
        <Button variant="ghost" onClick={() => navigate("/my-ebooks")}>
          <ChevronLeft className="mr-1" /> Exit
        </Button>

        <div className="flex gap-2 items-center">
          <Button
            size="icon"
            onClick={() => setPageNum((p) => Math.max(p - 1, 1))}
            disabled={pageNum <= 1}
          >
            <ChevronLeft />
          </Button>

          <span>
            Page {pageNum} / {numPages || "--"}
          </span>

          <Button
            size="icon"
            onClick={() => setPageNum((p) => Math.min(p + 1, numPages))}
            disabled={pageNum >= numPages}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>

      {/* Viewer */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
        {loading ? (
          <p>Loading PDF…</p>
        ) : (
          <canvas
            ref={canvasRef}
            className="bg-card shadow-xl select-none"
            onContextMenu={(e) => e.preventDefault()}
          />
        )}
      </div>
    </div>
  );
}