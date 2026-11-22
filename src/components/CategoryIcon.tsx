import React from 'react';
import {
  Utensils,
  Home,
  Car,
  Zap,
  Film,
  ShoppingBag,
  ShoppingCart,
  HeartPulse,
  GraduationCap,
  Coffee,
  Briefcase,
  Laptop,
  TrendingUp,
  BarChart3,
  Gift,
  PlusCircle,
  Tag,
  CreditCard,
  Landmark,
  Banknote,
  PiggyBank,
  Wallet as WalletIcon,
  Receipt,
  Smartphone,
  Fuel,
  ShoppingBasket,
  Wrench,
  Palmtree,
  Bike,
  Coins,
  Shirt,
  HelpCircle,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  Utensils,
  Home,
  Car,
  Zap,
  Film,
  ShoppingBag,
  ShoppingCart,
  HeartPulse,
  GraduationCap,
  Coffee,
  Briefcase,
  Laptop,
  TrendingUp,
  BarChart3,
  Gift,
  PlusCircle,
  Tag,
  CreditCard,
  Landmark,
  Banknote,
  PiggyBank,
  Wallet: WalletIcon,
  Receipt,
  Smartphone,
  Fuel,
  ShoppingBasket,
  Wrench,
  Palmtree,
  Bike,
  Coins,
  Shirt,
};

interface CategoryIconProps {
  name: string;
  color?: string;
  className?: string;
  size?: number;
}

// Check if string contains emoji
function isEmoji(str: string): boolean {
  return /\p{Extended_Pictographic}/u.test(str);
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  name,
  color = '#64748b',
  className = '',
  size = 18,
}) => {
  if (isEmoji(name)) {
    return (
      <div
        className={`inline-flex items-center justify-center rounded-xl p-2 select-none ${className}`}
        style={{
          backgroundColor: `${color}18`,
          fontSize: `${size}px`,
          lineHeight: 1,
        }}
      >
        <span>{name}</span>
      </div>
    );
  }

  const IconComponent = ICON_MAP[name] || HelpCircle;

  return (
    <div
      className={`inline-flex items-center justify-center rounded-xl p-2 transition-transform ${className}`}
      style={{
        backgroundColor: `${color}18`,
        color: color,
      }}
    >
      <IconComponent size={size} strokeWidth={2.2} />
    </div>
  );
};
