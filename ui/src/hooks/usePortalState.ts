// Ethiopian Coffee Export Consortium Blockchain System (CECBS)
// usePortalState Hook
// Provides consistent state management for all portals

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from './useNotification';

interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  roles: string[];
  tabIndex: number;
}

interface TabCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  roles: string[];
  children: TabItem[];
}

interface PortalStateConfig {
  initialTab?: number;
  enableSearch?: boolean;
  enableFilters?: boolean;
  enablePagination?: boolean;
  rowsPerPageOptions?: number[];
}

export const usePortalState = (config: PortalStateConfig = {}) => {
  const {
    initialTab = 0,
    enableSearch = true,
    enableFilters = true,
    enablePagination = true,
    rowsPerPageOptions = [5, 10, 25, 50],
  } = config;

  const { user } = useAuth();
  const notification = useNotification();

  // Tab Navigation
  const [activeParentTab, setActiveParentTab] = useState(0);
  const [activeChildTab, setActiveChildTab] = useState(0);
  const [activeTab, setActiveTab] = useState(initialTab);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(rowsPerPageOptions[0]);

  // Loading States
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  // Dialog States
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  // Bulk Selection
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [bulkActionInProgress, setBulkActionInProgress] = useState(false);

  // Helper function to get active tab index from parent/child selection
  const getActiveTabIndex = useCallback((
    tabStructure: TabCategory[],
    parentTab: number,
    childTab: number
  ): number => {
    if (tabStructure[parentTab]?.children[childTab]) {
      return tabStructure[parentTab].children[childTab].tabIndex;
    }
    return 0;
  }, []);

  // Update activeTab when parent/child tabs change
  const updateActiveTab = useCallback((
    tabStructure: TabCategory[],
    parentTab: number,
    childTab: number
  ) => {
    const newActiveTab = getActiveTabIndex(tabStructure, parentTab, childTab);
    setActiveTab(newActiveTab);
  }, [getActiveTabIndex]);

  // Parent tab change handler
  const handleParentTabChange = useCallback((
    event: React.SyntheticEvent,
    newValue: number,
    tabStructure: TabCategory[]
  ) => {
    setActiveParentTab(newValue);
    setActiveChildTab(0); // Reset child tab
    setCurrentPage(0); // Reset pagination
    setSearchTerm(''); // Clear search
    setFilterStatus('ALL'); // Reset filters
    updateActiveTab(tabStructure, newValue, 0);
  }, [updateActiveTab]);

  // Child tab change handler
  const handleChildTabChange = useCallback((
    event: React.SyntheticEvent,
    newValue: number,
    tabStructure: TabCategory[]
  ) => {
    setActiveChildTab(newValue);
    setCurrentPage(0); // Reset pagination
    setSearchTerm(''); // Clear search
    setFilterStatus('ALL'); // Reset filters
    updateActiveTab(tabStructure, activeParentTab, newValue);
  }, [activeParentTab, updateActiveTab]);

  // Filter role-based tabs
  const filterTabsByRole = useCallback((
    tabStructure: TabCategory[],
    userRole: string
  ): TabCategory[] => {
    const isSuperAdmin = userRole === 'ADMIN';
    
    if (isSuperAdmin) return tabStructure;
    
    return tabStructure
      .filter(parent => parent.roles.includes(userRole))
      .map(parent => ({
        ...parent,
        children: parent.children.filter(child => child.roles.includes(userRole))
      }))
      .filter(parent => parent.children.length > 0);
  }, []);

  // Reset search and filters
  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setFilterStatus('ALL');
    setDateFrom('');
    setDateTo('');
    setAmountMin('');
    setAmountMax('');
    setCurrentPage(0);
  }, []);

  // Open dialog with type and item
  const openDialog = useCallback((type: string, item?: any) => {
    setDialogType(type);
    setSelectedItem(item || null);
    setDialogOpen(true);
  }, []);

  // Close dialog
  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setDialogType(null);
    setSelectedItem(null);
  }, []);

  // Toggle item selection
  const toggleItemSelection = useCallback((itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  }, []);

  // Select all items
  const selectAllItems = useCallback((itemIds: string[]) => {
    setSelectedItems(itemIds);
  }, []);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedItems([]);
  }, []);

  return {
    // User & Notifications
    user,
    ...notification,

    // Tab Navigation
    activeParentTab,
    activeChildTab,
    activeTab,
    setActiveParentTab,
    setActiveChildTab,
    setActiveTab,
    handleParentTabChange,
    handleChildTabChange,
    getActiveTabIndex,
    filterTabsByRole,

    // Search & Filters
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    amountMin,
    setAmountMin,
    amountMax,
    setAmountMax,
    showAdvancedFilters,
    setShowAdvancedFilters,
    resetFilters,

    // Pagination
    currentPage,
    setCurrentPage,
    rowsPerPage,
    setRowsPerPage,

    // Loading States
    loading,
    setLoading,
    dataLoading,
    setDataLoading,

    // Dialog States
    dialogOpen,
    dialogType,
    selectedItem,
    openDialog,
    closeDialog,
    setDialogOpen,
    setDialogType,
    setSelectedItem,

    // Bulk Selection
    selectedItems,
    bulkActionInProgress,
    setBulkActionInProgress,
    toggleItemSelection,
    selectAllItems,
    clearSelection,
  };
};

export default usePortalState;
