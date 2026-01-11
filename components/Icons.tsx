
import React from 'react';
import { 
  MessageSquare, 
  Mic, 
  FileText, 
  Settings, 
  Plus, 
  Trash2, 
  ChevronRight, 
  ChevronDown,
  Menu, 
  X,
  Clock,
  Info,
  ArrowRight,
  UserPlus,
  CheckCircle2,
  Mail,
  AlertCircle,
  ShieldCheck,
  HelpCircle
} from 'lucide-react';

export const ChatIcon = ({ className = "w-6 h-6" }) => <MessageSquare className={className} />;
export const MicIcon = ({ className = "w-6 h-6" }) => <Mic className={className} />;
export const DocIcon = ({ className = "w-6 h-6" }) => <FileText className={className} />;
export const SettingsIcon = ({ className = "w-6 h-6" }) => <Settings className={className} />;
export const PlusIcon = ({ className = "w-6 h-6" }) => <Plus className={className} />;
export const TrashIcon = ({ className = "w-6 h-6" }) => <Trash2 className={className} />;
export const ArrowRightIcon = ({ className = "w-6 h-6" }) => <ArrowRight className={className} />;
export const MenuIcon = ({ className = "w-6 h-6" }) => <Menu className={className} />;
export const CloseIcon = ({ className = "w-6 h-6" }) => <X className={className} />;
export const ClockIcon = ({ className = "w-6 h-6" }) => <Clock className={className} />;
export const InfoIcon = ({ className = "w-6 h-6" }) => <Info className={className} />;
export const UserPlusIcon = ({ className = "w-6 h-6" }) => <UserPlus className={className} />;
export const CheckCircleIcon = ({ className = "w-6 h-6" }) => <CheckCircle2 className={className} />;
export const MailIcon = ({ className = "w-6 h-6" }) => <Mail className={className} />;
export const AlertIcon = ({ className = "w-6 h-6" }) => <AlertCircle className={className} />;
export const ShieldIcon = ({ className = "w-6 h-6" }) => <ShieldCheck className={className} />;
export const HelpIcon = ({ className = "w-6 h-6" }) => <HelpCircle className={className} />;
export const ChevronDownIcon = ({ className = "w-6 h-6" }) => <ChevronDown className={className} />;
