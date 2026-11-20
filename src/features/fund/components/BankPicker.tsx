import { useState } from 'react';
import type { Bank } from '../model/runtime-fund';
import { Input } from '../../../shared/components/Input';
import { Select } from '../../../shared/components/Select';
import { Button } from '../../../shared/components/Button';

export function BankPicker({
  banks,
  loading,
  failed,
  retry,
  value,
  onChange,
}: {
  banks: readonly Bank[] | null;
  loading: boolean;
  failed: boolean;
  retry: () => void;
  value: string;
  onChange: (value: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [manual, setManual] = useState(false);
  const query = search.trim().toLocaleLowerCase('vi');
  const matches = banks?.filter(
    (bank) =>
      bank.code === value ||
      `${bank.code} ${bank.bin} ${bank.short_name} ${bank.name}`
        .toLocaleLowerCase('vi')
        .includes(query),
  );
  return (
    <div>
      {loading && <p role="status">Đang tải danh mục ngân hàng…</p>}
      {failed && (
        <p role="alert">Không tải được danh mục. Bạn có thể thử lại hoặc nhập mã thủ công.</p>
      )}
      {(!banks || failed) && (
        <Button variant="plain" disabled={loading} onClick={retry}>
          Tải lại ngân hàng
        </Button>
      )}
      {banks && !manual ? (
        <>
          <Input
            label="Tìm ngân hàng"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            hint="Tìm theo tên, mã ngân hàng hoặc BIN."
          />
          <Select
            label="Ngân hàng"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required
          >
            <option value="">Chọn ngân hàng</option>
            {value && !banks.some((bank) => bank.code === value) && (
              <option value={value}>{value} (mã đang lưu)</option>
            )}
            {matches?.map((bank) => (
              <option key={bank.code} value={bank.code}>
                {bank.short_name} — {bank.name}
              </option>
            ))}
          </Select>
          {matches?.length === 0 && <p role="status">Không tìm thấy ngân hàng phù hợp.</p>}
        </>
      ) : (
        <Input
          label="Mã ngân hàng VietQR"
          value={value}
          maxLength={30}
          onChange={(e) => onChange(e.target.value)}
          required
          hint="Nhập mã VietQR (ví dụ VCB, TCB, MB) hoặc BIN 6 số."
        />
      )}
      {banks && (
        <Button variant="plain" onClick={() => setManual(!manual)}>
          {manual ? 'Chọn từ danh mục' : 'Nhập mã thủ công'}
        </Button>
      )}
    </div>
  );
}
