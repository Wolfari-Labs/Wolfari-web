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
  Tag,
  ReceiptText,
  Lock,
  Hourglass,
  History,
  ArrowLeftRight,
  Target,
  Mail,
  Crown,
  UserPlus,
  Clock,
  Sparkles,
  ImagePlus,
  FileText,
  Car,
  Pause,
  Play,
  TriangleAlert,
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
  trash: Trash2,
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
  // Web v2 Finance / Price Watch (Figma W10, W11) glyphs.
  tag: Tag,
  receipt: ReceiptText,
  lock: Lock,
  hourglass: Hourglass,
  history: History,
  handover: ArrowLeftRight,
  target: Target,
  mail: Mail,
  // Web v2 Members / Settings / Create Trip (Figma W12, W14, W03) glyphs.
  crown: Crown,
  userPlus: UserPlus,
  clock: Clock,
  sparkles: Sparkles,
  imagePlus: ImagePlus,
  fileText: FileText,
  // Web v2 Plan (Figma W06) day stats.
  car: Car,
  // Web v2 Price Watch card actions and data-quality notes.
  pause: Pause,
  play: Play,
  alert: TriangleAlert,
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
