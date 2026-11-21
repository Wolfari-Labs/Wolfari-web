import {
  House,
  MapPin,
  CalendarDays,
  Users,
  Wallet,
  Plane,
  Settings,
  Shirt,
  Backpack,
  Bell,
  Menu,
  X,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  Search,
  GripVertical,
  MoreHorizontal,
  Check,
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
  RefreshCw,
  Info,
  LogOut,
  UserRound,
  Compass,
  Map as MapFolded,
  Calendar,
  Luggage,
  Share2,
  Sun,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
const icons = {
  home: House,
  map: MapPin,
  plan: CalendarDays,
  members: Users,
  fund: Wallet,
  price: Plane,
  settings: Settings,
  dress: Shirt,
  packing: Backpack,
  bell: Bell,
  menu: Menu,
  close: X,
  chevron: ChevronDown,
  collapse: ChevronsLeft,
  expand: ChevronsRight,
  plus: Plus,
  search: Search,
  grip: GripVertical,
  more: MoreHorizontal,
  check: Check,
  up: ArrowUp,
  down: ArrowDown,
  edit: Pencil,
  delete: Trash2,
  refresh: RefreshCw,
  info: Info,
  logout: LogOut,
  user: UserRound,
  // Web v2 (Figma 930:6659) navigation glyphs.
  compass: Compass,
  mapFolded: MapFolded,
  calendar: Calendar,
  luggage: Luggage,
  share: Share2,
  sun: Sun,
  chevronRight: ChevronRight,
  chevronLeft: ChevronLeft,
};
export type IconName = keyof typeof icons;
export function Icon({
  name,
  size = 20,
  className,
  strokeWidth = 1.8,
}: {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  const Component = icons[name];
  return (
    <Component
      size={size}
      strokeWidth={strokeWidth}
      aria-hidden="true"
      focusable="false"
      className={className}
    />
  );
}
