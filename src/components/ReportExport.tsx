import React from 'react';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import { useData } from '../pages/DataProvider';
import { toast } from 'sonner';

interface ReportExportProps {
  periode?: string;
  tahun?: number;
  title?: string;
  reportData?: any[];
  stats?: any;
  filters?: any;
}

export function ReportExport({ 
  periode, 
  tahun, 
  title = "Laporan IKU", 
  reportData: externalReportData, 
  stats: externalStats, 
  filters: externalFilters 
}: ReportExportProps) {
  const { ikus, targets, realisasis, teams, users } = useData();
  
  const generateReportData = () => {
    // Use external data if provided, otherwise generate from DataProvider
    if (externalReportData && externalReportData.length > 0) {
      // Transform external data to match new export format - one row per indikator
      return externalReportData.map((item: any) => ({
        nama_indikator: item.nama_indikator || '',
        tim: item.tim || '',
        ketua_tim: item.ketua_tim || '',
        jenis_indikator: item.jenis_indikator === 'iku' ? 'IKU' : 'Proksi',
        jenis_nilai: item.jenis_nilai || 'Poin (Non %)',
        target: item.target || 0, // Target Per Tahun
        alokasi_target_tw1: item.alokasi_target?.['TW 1'] || 0,
        alokasi_target_tw2: item.alokasi_target?.['TW 2'] || 0,
        alokasi_target_tw3: item.alokasi_target?.['TW 3'] || 0,
        alokasi_target_tw4: item.alokasi_target?.['TW 4'] || 0,
        realisasi_tw1: item.realisasi?.['TW 1'] || 0,
        realisasi_tw2: item.realisasi?.['TW 2'] || 0,
        realisasi_tw3: item.realisasi?.['TW 3'] || 0,
        realisasi_tw4: item.realisasi?.['TW 4'] || 0,
        capaian: typeof item.capaian === 'number' ? item.capaian : null,
        status: item.status || '',
        performance: item.performance || []
      }));
    }
    
    // Use the same logic as AdminReporting.tsx
    const allIKUs = ikus || [];
    const allTargets = targets || [];
    const allRealisasis = realisasis || [];
    const allTeams = teams || [];
    const allUsers = users || [];
    
    // Filter by team if specified
    const filteredIKUs = externalFilters?.team !== 'all' 
      ? allIKUs.filter(iku => iku.id_tim === parseInt(externalFilters.team))
      : allIKUs;
    
    // Filter by year
    const currentYear = tahun || new Date().getFullYear();
    const filteredTargets = allTargets.filter((t: any) => t.tahun === currentYear);
    const filteredRealisasis = allRealisasis.filter((r: any) => r.tahun === currentYear);
    
    // Return empty array if no data available
    return [];
  };

  const exportToExcel = () => {
    try {
      const data = generateReportData();
      
      // Create Excel-compatible CSV format with proper encoding
      let csvContent = '\uFEFF'; // BOM for UTF-8
      csvContent += `${title}\n`;
      csvContent += `Generated: ${new Date().toLocaleDateString('id-ID')}\n`;
      csvContent += `Period: ${periode || 'All'}, Year: ${tahun || 'All'}\n\n`;
      
      // Detailed Report - sesuai dengan struktur tabel baru di AdminReporting
      csvContent += "=== LAPORAN DETAIL INDIKATOR KINERJA ===\n";
      csvContent += "Indikator Kinerja,Tim,Ketua Tim (PIC),Jenis (IKU atau Proksi),Jenis Nilai (Persen (%) atau Poin (Non %)),Target Per Tahun,Alokasi Target TW I,Alokasi Target TW II,Alokasi Target TW III,Alokasi Target TW IV,Realisasi TW I,Realisasi TW II,Realisasi TW III,Realisasi TW IV,Capaian (%),Status\n";
      
      data.forEach((item: any) => {
        csvContent += `"${item.nama_indikator}","${item.tim}","${item.ketua_tim}","${item.jenis_indikator}","${item.jenis_nilai}",${item.target},${item.alokasi_target_tw1},${item.alokasi_target_tw2},${item.alokasi_target_tw3},${item.alokasi_target_tw4},${item.realisasi_tw1},${item.realisasi_tw2},${item.realisasi_tw3},${item.realisasi_tw4},${item.capaian ?? ''},"${item.status || ''}"\n`;
      });
      
      // Download as Excel-compatible CSV
      const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Laporan_IKU_${new Date().toISOString().split('T')[0]}.xls`;
      link.click();
      
      toast.success('Laporan Excel berhasil diunduh');
    } catch (error) {
      // console.error('Error exporting Excel:', error);
      toast.error('Gagal mengunduh laporan Excel');
    }
  };

  const exportToCSV = () => {
    try {
      const data = generateReportData();
      
      // Create simple CSV format
      let csvContent = `${title}\n`;
      csvContent += `Generated: ${new Date().toLocaleDateString('id-ID')}\n`;
      csvContent += `Period: ${periode || 'All'}, Year: ${tahun || 'All'}\n\n`;
      
      // Headers
      csvContent += "Indikator Kinerja,Tim,Ketua Tim (PIC),Jenis (IKU atau Proksi),Jenis Nilai (Persen (%) atau Poin (Non %)),Target Per Tahun,Alokasi Target TW I,Alokasi Target TW II,Alokasi Target TW III,Alokasi Target TW IV,Realisasi TW I,Realisasi TW II,Realisasi TW III,Realisasi TW IV,Capaian (%),Status\n";
      
      // Data rows
      data.forEach((item: any) => {
        csvContent += `"${item.nama_indikator}","${item.tim}","${item.ketua_tim}","${item.jenis_indikator}","${item.jenis_nilai}",${item.target},${item.alokasi_target_tw1},${item.alokasi_target_tw2},${item.alokasi_target_tw3},${item.alokasi_target_tw4},${item.realisasi_tw1},${item.realisasi_tw2},${item.realisasi_tw3},${item.realisasi_tw4},${item.capaian ?? ''},"${item.status || ''}"\n`;
      });
      
      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Laporan_IKU_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      toast.success('Laporan CSV berhasil diunduh');
    } catch (error) {
      // console.error('Error exporting CSV:', error);
      toast.error('Gagal mengunduh laporan CSV');
    }
  };

  const exportToPDF = () => {
    try {
      const data = generateReportData();
      const allTeams = teams || [];
      
      // Use external stats if provided, otherwise calculate from data
      let totalIKUs, totalTargets, totalRealisations, avgAchievement, completionRate;
      
      if (externalStats) {
        totalIKUs = externalStats.totalIKUs;
        totalTargets = externalStats.totalTargets;
        totalRealisations = externalStats.totalRealisations;
        avgAchievement = externalStats.avgAchievement;
        completionRate = externalStats.completionRate;
      } else {
        // Calculate from new data structure
        totalIKUs = data.length;
        totalTargets = data.reduce((sum: number, item: any) => sum + (item.target || 0), 0);
        totalRealisations = data.reduce((sum: number, item: any) => {
          const totalReal = (item.realisasi_tw1 || 0) + (item.realisasi_tw2 || 0) + (item.realisasi_tw3 || 0) + (item.realisasi_tw4 || 0);
          return sum + totalReal;
        }, 0);
        avgAchievement = totalIKUs > 0 ? data.reduce((sum: number, item: any) => {
          const totalReal = (item.realisasi_tw1 || 0) + (item.realisasi_tw2 || 0) + (item.realisasi_tw3 || 0) + (item.realisasi_tw4 || 0);
          const capaian = item.target > 0 ? (totalReal / item.target) * 100 : 0;
          return sum + capaian;
        }, 0) / totalIKUs : 0;
        completionRate = totalIKUs > 0 ? (data.filter((item: any) => {
          const totalReal = (item.realisasi_tw1 || 0) + (item.realisasi_tw2 || 0) + (item.realisasi_tw3 || 0) + (item.realisasi_tw4 || 0);
          return totalReal > 0;
        }).length / totalIKUs) * 100 : 0;
      }
      
      // Get team name for filter display
      let teamFilterName = 'Semua Tim';
      if (externalFilters && externalFilters.team !== 'all') {
        const selectedTeam = allTeams.find(t => t.id_tim === parseInt(externalFilters.team));
        teamFilterName = selectedTeam?.nama_tim || 'Semua Tim';
      }
      
      // Get period filter display
      let periodFilterName = periode || 'Semua Periode';
      if (externalFilters) {
        if (externalFilters.quarter && externalFilters.quarter !== 'all') {
          periodFilterName = externalFilters.quarter;
        } else if (externalFilters.period && externalFilters.period !== 'all') {
          periodFilterName = externalFilters.period;
        }
      }
      
      // Create HTML content for PDF
      let htmlContent = `
        <html>
          <head>
            <title>${title}</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                margin: 20px; 
                line-height: 1.4;
              }
              h1 { 
                color: #333; 
                border-bottom: 2px solid #4F46E5; 
                padding-bottom: 10px; 
                margin-bottom: 20px;
              }
              h2 { 
                color: #555; 
                margin-top: 30px; 
                margin-bottom: 15px;
              }
              .filter-info {
                background-color: #f8f9fa;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
                border-left: 4px solid #4F46E5;
              }
              .summary {
                background-color: #f8f9fa;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
              }
              .summary-table {
                width: 100%;
                border-collapse: collapse;
                margin: 10px 0;
              }
              .summary-table td {
                padding: 8px;
                border-bottom: 1px solid #ddd;
              }
              .summary-table td:first-child {
                width: 60%;
              }
              table { 
                width: 100%; 
                border-collapse: collapse; 
                margin: 20px 0; 
              }
              th, td { 
                border: 1px solid #ddd; 
                padding: 8px; 
                text-align: left; 
              }
              th { 
                background-color: #f8f9fa; 
                font-weight: bold; 
              }
              .status-excellent { color: #059669; font-weight: bold; }
              .status-good { color: #D97706; font-weight: bold; }
              .status-fair { color: #DC2626; font-weight: bold; }
              .status-poor { color: #DC2626; font-weight: bold; }
              .page-break { page-break-before: always; }
            </style>
          </head>
          <body>
            <h1>${title} - Admin Dashboard</h1>
            
            <div class="filter-info">
              <strong>Filter Applied:</strong><br>
              Tim: ${teamFilterName}<br>
              Tahun: ${externalFilters ? (externalFilters.year || tahun || 'Semua') : (tahun || 'Semua')}<br>
              Periode: ${periodFilterName}<br>
              Tanggal Generate: ${new Date().toLocaleDateString('id-ID')}
            </div>
            
            <div class="summary">
              <h2>Ringkasan Kinerja</h2>
              <table class="summary-table">
                <tbody>
                  <tr><td><strong>Total IKU</strong></td><td>${totalIKUs}</td></tr>
                  <tr><td><strong>Total Target</strong></td><td>${Math.round(totalTargets).toLocaleString('id-ID')}</td></tr>
                  <tr><td><strong>Total Realisasi</strong></td><td>${Math.round(totalRealisations).toLocaleString('id-ID')}</td></tr>
                  <tr><td><strong>Rata-rata Pencapaian</strong></td><td>${avgAchievement.toFixed(1)}%</td></tr>
                  <tr><td><strong>Tingkat Kelengkapan</strong></td><td>${completionRate.toFixed(0)}%</td></tr>
                </tbody>
              </table>
            </div>
            
            <h2>Detail Laporan Indikator Kinerja</h2>
            <table>
              <thead>
                <tr>
                  <th>Indikator Kinerja</th>
                  <th>Tim</th>
                  <th>Ketua Tim (PIC)</th>
                  <th>Jenis (IKU atau Proksi)</th>
                  <th>Jenis Nilai (Persen (%) atau Poin (Non %))</th>
                  <th>Target Per Tahun</th>
                  <th>Alokasi Target TW I</th>
                  <th>Alokasi Target TW II</th>
                  <th>Alokasi Target TW III</th>
                  <th>Alokasi Target TW IV</th>
                  <th>Realisasi TW I</th>
                  <th>Realisasi TW II</th>
                  <th>Realisasi TW III</th>
                  <th>Realisasi TW IV</th>
                  <th>Capaian (%)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
      `;
      
      data.forEach((item: any) => {
        htmlContent += `
          <tr>
            <td>${item.nama_indikator}</td>
            <td>${item.tim}</td>
            <td>${item.ketua_tim}</td>
            <td>${item.jenis_indikator}</td>
            <td>${item.jenis_nilai}</td>
            <td>${item.target?.toLocaleString('id-ID') || 0}</td>
            <td>${item.alokasi_target_tw1?.toLocaleString('id-ID') || 0}</td>
            <td>${item.alokasi_target_tw2?.toLocaleString('id-ID') || 0}</td>
            <td>${item.alokasi_target_tw3?.toLocaleString('id-ID') || 0}</td>
            <td>${item.alokasi_target_tw4?.toLocaleString('id-ID') || 0}</td>
            <td>${item.realisasi_tw1?.toLocaleString('id-ID') || 0}</td>
            <td>${item.realisasi_tw2?.toLocaleString('id-ID') || 0}</td>
            <td>${item.realisasi_tw3?.toLocaleString('id-ID') || 0}</td>
            <td>${item.realisasi_tw4?.toLocaleString('id-ID') || 0}</td>
            <td>${item.capaian ?? ''}</td>
            <td>${item.status || ''}</td>
          </tr>
        `;
      });
      
      htmlContent += `
              </tbody>
            </table>
            
            <div class="page-break"></div>
            <h2>Kendala dan Solusi</h2>
            <table>
              <thead>
                <tr>
                  <th>Nama IKU</th>
                  <th>Periode</th>
                  <th>Kendala</th>
                  <th>Solusi</th>
                  <th>Batas Waktu</th>
                  <th>Link BDK</th>
                </tr>
              </thead>
              <tbody>
      `;
      
      data.forEach((item: any) => {
        if (item.performance && Array.isArray(item.performance)) {
          item.performance.forEach((perf: any) => {
            if (perf.kendala !== '-' || perf.solusi !== '-') {
              htmlContent += `
                <tr>
                  <td>${item.nama_indikator}</td>
                  <td>${perf.periode || '-'}</td>
                  <td>${perf.kendala || '-'}</td>
                  <td>${perf.solusi || '-'}</td>
                  <td>${perf.batas_waktu !== '-' && perf.batas_waktu ? new Date(perf.batas_waktu).toLocaleDateString('id-ID') : '-'}</td>
                  <td>${perf.link_bdk !== '-' && perf.link_bdk ? `<a href="${perf.link_bdk}" target="_blank">${perf.link_bdk}</a>` : '-'}</td>
                </tr>
              `;
            }
          });
        }
      });
      
      htmlContent += '</body></html>';
      
      // Open in new window for printing to PDF
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        
        // Trigger print dialog
        setTimeout(() => {
          printWindow.print();
          toast.success('Laporan PDF siap untuk dicetak. Pilih "Save as PDF" pada dialog print.');
        }, 500);
      }
    } catch (error) {
      toast.error('Gagal membuat laporan PDF');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center">
          <Download className="h-4 w-4 mr-2" />
          Export Laporan
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={exportToExcel}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export ke Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToCSV}>
          <FileText className="h-4 w-4 mr-2" />
          Export ke CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToPDF}>
          <FileText className="h-4 w-4 mr-2" />
          Export ke PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}