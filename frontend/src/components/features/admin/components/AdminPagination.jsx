import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

export default function AdminPagination({
    currentPage,
    totalPages,
    onPageChange,
}) {
    if (totalPages < 1) return null;

    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
        pages.push(1);
        let start = Math.max(2, currentPage - 1);
        let end = Math.min(totalPages - 1, currentPage + 1);

        if (currentPage <= 2) end = 4;
        if (currentPage >= totalPages - 1) start = totalPages - 3;

        if (start > 2) pages.push("ellipsis-1");
        for (let i = start; i <= end; i++) pages.push(i);
        if (end < totalPages - 1) pages.push("ellipsis-2");
        pages.push(totalPages);
    }

    return (
        <Pagination className="mt-4">
            <PaginationContent>
                <PaginationItem>
                    <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                            e.preventDefault();
                            if (currentPage > 1) onPageChange(currentPage - 1);
                        }}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                </PaginationItem>

                {pages.map((page, index) => (
                    <PaginationItem key={index}>
                        {typeof page === "number" ? (
                            <PaginationLink
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    onPageChange(page);
                                }}
                                isActive={currentPage === page}
                                className="cursor-pointer"
                            >
                                {page}
                            </PaginationLink>
                        ) : (
                            <PaginationEllipsis />
                        )}
                    </PaginationItem>
                ))}

                <PaginationItem>
                    <PaginationNext
                        href="#"
                        onClick={(e) => {
                            e.preventDefault();
                            if (currentPage < totalPages) onPageChange(currentPage + 1);
                        }}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                </PaginationItem>
            </PaginationContent>
        </Pagination>
    );
}
