import React from "react";
import { Button } from "@material-tailwind/react";

const Pagination = ({ page, totalPages, onPageChange }) => {
    return (
        <div className="flex justify-center items-center mb-3 gap-2">
            <Button disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
                Previous
            </Button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || (p >= page - 2 && p <= page + 2))
                .map((p, idx, arr) => {
                    const prev = arr[idx - 1];
                    const showDots = prev && p - prev > 1;
                    return (
                        <React.Fragment key={p}>
                            {showDots && <span className="px-2 text-sm text-gray-500">...</span>}
                            <Button
                                onClick={() => onPageChange(p)}
                                variant={page === p ? "gradient" : "text"}
                            >
                                {p}
                            </Button>
                        </React.Fragment>
                    );
                })}

            <Button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
                Next
            </Button>
        </div>
    );
};

export default Pagination;
