import React from 'react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  lastPage: number;
  total: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
  className?: string;
}

export function Pagination({ 
  currentPage, 
  lastPage, 
  total, 
  perPage, 
  onPageChange,
  onPerPageChange,
  className = ''
}: PaginationProps) {
  // Calculate pagination info
  const from = total > 0 ? (currentPage - 1) * perPage + 1 : 0;
  const to = Math.min(currentPage * perPage, total);
  
  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;
    
    if (lastPage <= maxVisiblePages) {
      // Show all pages if total pages is small
      for (let i = 1; i <= lastPage; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('...');
      }
      
      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(lastPage - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== lastPage) {
          pages.push(i);
        }
      }
      
      if (currentPage < lastPage - 2) {
        pages.push('...');
      }
      
      // Always show last page
      if (lastPage > 1) {
        pages.push(lastPage);
      }
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white border-t ${className}`}>
      {/* Pagination Info */}
      <div className="flex items-center gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <span>Menampilkan</span>
          <Select value={perPage.toString()} onValueChange={(value) => onPerPageChange(parseInt(value))}>
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="15">15</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span>dari {total} data</span>
        </div>
        
        <div className="text-gray-500">
          {total > 0 ? `${from}-${to} dari ${total}` : 'Tidak ada data'}
        </div>
      </div>

      {/* Pagination Controls */}
      {lastPage > 1 && (
        <div className="flex items-center gap-1">
          {/* First Page */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="h-8 w-8 p-0"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          {/* Previous Page */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Page Numbers */}
          {pageNumbers.map((page, index) => (
            <React.Fragment key={index}>
              {page === '...' ? (
                <span className="px-2 py-1 text-gray-500">...</span>
              ) : (
                <Button
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(page as number)}
                  className={`h-8 w-8 p-0 ${
                    currentPage === page 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {page}
                </Button>
              )}
            </React.Fragment>
          ))}

          {/* Next Page */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === lastPage}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Last Page */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(lastPage)}
            disabled={currentPage === lastPage}
            className="h-8 w-8 p-0"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// Compact version for smaller spaces
export function CompactPagination({ 
  currentPage, 
  lastPage, 
  total, 
  perPage, 
  onPageChange,
  onPerPageChange,
  className = ''
}: PaginationProps) {
  const from = total > 0 ? (currentPage - 1) * perPage + 1 : 0;
  const to = Math.min(currentPage * perPage, total);

  return (
    <div className={`flex items-center justify-between gap-2 p-2 ${className}`}>
      <div className="text-xs text-gray-600">
        {total > 0 ? `${from}-${to} dari ${total}` : 'Tidak ada data'}
      </div>
      
      {lastPage > 1 && (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="h-6 w-6 p-0"
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          
          <span className="text-xs text-gray-600 px-2">
            {currentPage} / {lastPage}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === lastPage}
            className="h-6 w-6 p-0"
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
