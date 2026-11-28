import { useRef, useState, type RefObject } from 'react';
import { Button } from '../../../shared/components/Button';
import { Alert } from '../../../shared/components/Alert';
import { ActionMenu, ConfirmDialog } from '../../../shared/components/Ui';
import { Icon } from '../../../shared/components/Icon';
import {
  PreparationStatus,
  usePreparationCommands,
  type PreparationProps,
} from '../../plan/components/PreparationActions';
import { activePlan } from '../../plan/model/preparation';
import type { PackingItemViewModel } from '../../plan/model/plan';
import {
  createPackingSuggestionCatalog,
  emptyPackingForm,
  packingDateToIso,
  packingFormFromItem,
  type PackingFormValues,
} from '../packing';
import { usePackingMembers } from '../use-packing-members';
import { PackingItemDrawer } from './PackingItemDrawer';

export function GatewayPackingEditor({
  item,
  addButtonRef,
  ...props
}: PreparationProps & {
  item?: PackingItemViewModel;
  addButtonRef?: RefObject<HTMLButtonElement | null>;
}) {
  const commands = usePreparationCommands(props);
  const roster = usePackingMembers(props.trip);
  const [draft, setDraft] = useState<{
    initial: PackingFormValues;
    version: number;
    dueAt: string | null;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteVersion, setDeleteVersion] = useState(0);
  const [error, setError] = useState('');
  const trigger = useRef<HTMLButtonElement>(null);
  const enabled =
    activePlan(props.trip) &&
    props.plan.permissions.canEdit &&
    props.plan.capabilities?.packing_items_write === true;
  const stale = !!draft && draft.version !== props.plan.planVersion;
  const open = () => {
    setError('');
    setDraft({
      initial: item ? packingFormFromItem(item, props.trip.timezone) : emptyPackingForm,
      version: props.plan.planVersion,
      dueAt: item?.dueAt ?? null,
    });
  };
  const save = async (values: PackingFormValues) => {
    if (!draft || !enabled || stale || commands.locked || !roster.data) return;
    if (values.assignedMemberId && !roster.data.some((m) => m.id === values.assignedMemberId)) {
      setError('Thành viên không còn khả dụng. Chọn lại người chuẩn bị.');
      return;
    }
    const fields = {
      name: values.name.trim(),
      quantity: values.quantity.trim(),
      unit: values.unit.trim() || null,
      category: values.category.trim() || null,
      note: values.note.trim() || null,
      assignedMemberId: values.assignedMemberId || null,
      dueAt:
        values.dueDate === draft.initial.dueDate
          ? draft.dueAt
          : values.dueDate
            ? packingDateToIso(values.dueDate, props.trip.timezone)
            : null,
    };
    const ok = await commands.submit(
      item
        ? { operation: 'packing-update', id: item.id, fields }
        : { operation: 'packing-create', fields },
    );
    if (ok) setDraft(null);
  };
  if (!enabled && !draft && !deleting) return null;
  return (
    <>
      {item ? (
        <ActionMenu
          triggerRef={trigger}
          label={`Thao tác ${item.name}`}
          items={[
            { label: 'Chỉnh sửa', disabled: !enabled || commands.locked, action: open },
            {
              label: 'Xóa',
              disabled: !enabled || commands.locked,
              danger: true,
              action: () => {
                setDeleteVersion(props.plan.planVersion);
                setDeleting(true);
              },
            },
          ]}
        />
      ) : (
        <Button
          ref={addButtonRef ?? trigger}
          disabled={!enabled || commands.locked}
          onClick={open}
          icon={<Icon name="plus" size={18} />}
        >
          Thêm vật dụng
        </Button>
      )}
      <PackingItemDrawer
        open={!!draft}
        mode={item ? 'edit' : 'add'}
        initial={draft?.initial ?? emptyPackingForm}
        catalog={createPackingSuggestionCatalog(props.plan.packingItems)}
        members={(roster.data ?? []).map((m) => ({
          id: m.id,
          label:
            m.id === props.trip.currentMembership.id
              ? 'Tôi'
              : (m.presentation.displayName ?? 'Thành viên'),
        }))}
        onDismiss={() => setDraft(null)}
        onSubmit={(values) => void save(values)}
        busy={commands.pending}
        disabled={!enabled || commands.locked || stale || !roster.data || roster.isError}
        showReminder={false}
        returnFocusRef={!item && addButtonRef ? addButtonRef : trigger}
        feedback={
          <>
            {roster.isPending && <p role="status">Đang tải thành viên…</p>}
            {roster.isError && (
              <Alert>
                Không tải được thành viên.{' '}
                <Button onClick={() => void roster.refetch()}>Tải lại thành viên</Button>
              </Alert>
            )}
            {stale && (
              <Alert>Danh sách đã thay đổi. Đóng và mở lại form để đối chiếu trước khi lưu.</Alert>
            )}
            {!enabled && <Alert>Bạn không còn quyền chỉnh sửa danh sách.</Alert>}
            {error && <Alert>{error}</Alert>}
            <PreparationStatus {...props} />
            <p>Sửa thông tin hoặc người chuẩn bị không tự thay đổi trạng thái hoàn thành.</p>
          </>
        }
      />
      <ConfirmDialog
        open={deleting}
        title="Xóa vật dụng?"
        description={
          commands.status === 'unknown'
            ? 'Chưa rõ kết quả xóa. Hủy hộp thoại và đối soát dữ liệu trước khi thử lại.'
            : commands.blocked || commands.status === 'error'
              ? 'Chưa thể xác nhận xóa. Hủy hộp thoại để kiểm tra lỗi và đối soát dữ liệu.'
              : deleteVersion !== props.plan.planVersion
                ? 'Danh sách đã thay đổi. Hủy và kiểm tra lại vật dụng trước khi xóa.'
                : `Xóa “${item?.name ?? ''}” khỏi danh sách chung của chuyến đi?`
        }
        busy={commands.pending}
        disabled={!enabled || commands.locked || deleteVersion !== props.plan.planVersion}
        returnFocusRef={trigger}
        onCancel={() => setDeleting(false)}
        onConfirm={() => {
          if (item && enabled && !commands.locked && deleteVersion === props.plan.planVersion)
            void commands.submit({ operation: 'packing-delete', id: item.id }).then((ok) => {
              if (ok) {
                setDeleting(false);
                window.setTimeout(() => addButtonRef?.current?.focus(), 0);
              }
            });
        }}
      />
    </>
  );
}
