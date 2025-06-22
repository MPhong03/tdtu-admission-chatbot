import React, { useEffect, useState } from "react";
import { Card } from "@material-tailwind/react";
import api from "@/configs/api";
import UserTable from "@/widgets/tables/user/user-table";
import Pagination from "@/widgets/tables/pagination";
import LoadingTable from "@/widgets/tables/components/loadingtable";

export function UserPage() {
    const [users, setUsers] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const size = 5;

    const fetchUsers = async (currentPage) => {
        setLoading(true);
        try {
            const res = await api.get(`/users?page=${currentPage}&size=${size}`);
            if (res.data.Code === 1) {
                setUsers(res.data.Data.items);
                setTotalPages(Math.ceil(res.data.Data.pagination.totalItems / size));
            }
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers(page);
    }, [page]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) setPage(newPage);
    };

    return (
        <div className="mt-12 mb-8 flex flex-col gap-12">
            <Card>
                {loading && <LoadingTable text="Đang tải" />}
                <UserTable users={users} page={page} size={size} />
                <Pagination
                    page={page}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                />
            </Card>
        </div>
    );
}

export default UserPage;
