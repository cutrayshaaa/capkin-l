import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';

interface PeriodFilterProps {
  periode: string;
  tahun: number;
  triwulan: string;
  onPeriodeChange: (value: string) => void;
  onTahunChange: (value: number) => void;
  onTriwulanChange: (value: string) => void;
}

export function PeriodFilter({
  periode,
  tahun,
  triwulan,
  onPeriodeChange,
  onTahunChange,
  onTriwulanChange
}: PeriodFilterProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 15 }, (_, i) => currentYear - 5 + i);

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="periode-select">Periode IKU</Label>
            <Select value={periode} onValueChange={onPeriodeChange}>
              <SelectTrigger id="periode-select">
                <SelectValue placeholder="Pilih periode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Periode</SelectItem>
                <SelectItem value="bulanan">Bulanan</SelectItem>
                <SelectItem value="triwulan">Quarter</SelectItem>
                <SelectItem value="semester">Semester</SelectItem>
                <SelectItem value="tahunan">Tahunan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tahun-select">Tahun</Label>
            <Select value={tahun.toString()} onValueChange={(value) => onTahunChange(parseInt(value))}>
              <SelectTrigger id="tahun-select">
                <SelectValue placeholder="Pilih tahun" />
              </SelectTrigger>
              <SelectContent>
                {years.map(year => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="triwulan-select">Quarter</Label>
            <Select value={triwulan} onValueChange={onTriwulanChange}>
              <SelectTrigger id="triwulan-select">
                <SelectValue placeholder="Pilih quarter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Triwulan</SelectItem>
                <SelectItem value="I">TW 1</SelectItem>
                <SelectItem value="II">TW 2</SelectItem>
                <SelectItem value="III">TW 3</SelectItem>
                <SelectItem value="IV">TW 4</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
