import React, { useState, useEffect } from 'react';

const AssetManager = () => {
  // State management
  const [assets, setAssets] = useState([]);
  const [locations, setLocations] = useState([
    { id: 1, name: 'Main Office', address: '123 Business St' },
    { id: 2, name: 'Warehouse A', address: '456 Industrial Ave' },
    { id: 3, name: 'Remote Site', address: '789 Field Rd' }
  ]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [filterLocation, setFilterLocation] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Multi-select state
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [showBulkTransfer, setShowBulkTransfer] = useState(false);
  const [bulkTransferTo, setBulkTransferTo] = useState('');
  const [showBulkDelete, setShowBulkDelete] = useState(false);

  // Company settings
  const [companyName, setCompanyName] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // Form states
  const [newAsset, setNewAsset] = useState({
    name: '',
    category: 'Equipment',
    purchaseDate: '',
    purchaseCost: '',
    currentValue: '',
    quantity: 1,
    locationId: '',
    description: '',
    serialNumber: '',
    depreciationRate: 10,
    photos: [],
    notes: []
  });

  const [editingAsset, setEditingAsset] = useState(null);
  const [showEditAsset, setShowEditAsset] = useState(false);
  const [showPhotoViewer, setShowPhotoViewer] = useState(null);
  const [fullscreenPhoto, setFullscreenPhoto] = useState(null);

  // Notes modal state
  const [showNotesModal, setShowNotesModal] = useState(null);
  const [newNote, setNewNote] = useState('');

  const [newLocation, setNewLocation] = useState({ name: '', address: '' });
  const [transferTo, setTransferTo] = useState('');
  const [transferQty, setTransferQty] = useState(1);

  // Asset categories - now as state so they can be managed
  const [categories, setCategories] = useState([
    'Equipment',
    'Furniture',
    'Vehicles',
    'Electronics',
    'Machinery',
    'Real Estate',
    'Inventory',
    'Other'
  ]);
  
  // Category management state
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  // Initialize with sample data
  useEffect(() => {
    const sampleAssets = [
      { id: 1, name: 'Dell Server Rack', category: 'Electronics', purchaseDate: '2023-01-15', purchaseCost: 15000, currentValue: 12000, quantity: 2, locationId: 1, description: 'Primary data center servers', serialNumber: 'DSR-2023-001', depreciationRate: 20, photos: [], notes: [] },
      { id: 2, name: 'Office Desk Set', category: 'Furniture', purchaseDate: '2022-06-20', purchaseCost: 800, currentValue: 600, quantity: 10, locationId: 1, description: 'Executive office desks', serialNumber: 'ODS-2022-001', depreciationRate: 10, photos: [], notes: [] },
      { id: 3, name: 'Forklift', category: 'Vehicles', purchaseDate: '2021-03-10', purchaseCost: 25000, currentValue: 18000, quantity: 1, locationId: 2, description: 'Toyota warehouse forklift', serialNumber: 'FL-2021-001', depreciationRate: 15, photos: [], notes: [] },
      { id: 4, name: 'Industrial Shelving', category: 'Equipment', purchaseDate: '2022-09-05', purchaseCost: 3000, currentValue: 2500, quantity: 20, locationId: 2, description: 'Heavy-duty storage racks', serialNumber: 'IS-2022-001', depreciationRate: 10, photos: [], notes: [] },
      { id: 5, name: 'Survey Equipment', category: 'Equipment', purchaseDate: '2023-05-18', purchaseCost: 8000, currentValue: 7200, quantity: 3, locationId: 3, description: 'GPS surveying kit', serialNumber: 'SE-2023-001', depreciationRate: 12, photos: [], notes: [] },
    ];
    setAssets(sampleAssets);
  }, []);

  // Calculate totals
  const calculateTotals = () => {
    const filteredAssets = filterLocation === 'all' 
      ? assets 
      : assets.filter(a => a.locationId === parseInt(filterLocation));
    
    return filteredAssets.reduce((acc, asset) => ({
      totalPurchaseCost: acc.totalPurchaseCost + (asset.purchaseCost * asset.quantity),
      totalCurrentValue: acc.totalCurrentValue + (asset.currentValue * asset.quantity),
      totalAssets: acc.totalAssets + asset.quantity
    }), { totalPurchaseCost: 0, totalCurrentValue: 0, totalAssets: 0 });
  };

  // Add new asset
  const handleAddAsset = () => {
    if (!newAsset.name || !newAsset.purchaseCost || !newAsset.locationId) return;
    
    const asset = {
      ...newAsset,
      id: Date.now(),
      purchaseCost: parseFloat(newAsset.purchaseCost),
      currentValue: parseFloat(newAsset.currentValue) || parseFloat(newAsset.purchaseCost),
      quantity: parseInt(newAsset.quantity),
      locationId: parseInt(newAsset.locationId),
      depreciationRate: parseFloat(newAsset.depreciationRate),
      photos: newAsset.photos || []
    };
    
    setAssets([...assets, asset]);
    setNewAsset({
      name: '',
      category: 'Equipment',
      purchaseDate: '',
      purchaseCost: '',
      currentValue: '',
      quantity: 1,
      locationId: '',
      description: '',
      serialNumber: '',
      depreciationRate: 10,
      photos: []
    });
    setShowAddAsset(false);
  };

  // Handle photo upload
  const handlePhotoUpload = (e, isEditing = false) => {
    const files = Array.from(e.target.files);
    const targetAsset = isEditing ? editingAsset : newAsset;
    const currentPhotos = targetAsset.photos || [];
    
    if (currentPhotos.length + files.length > 5) {
      alert('Maximum 5 photos allowed per asset');
      return;
    }
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isEditing) {
          setEditingAsset(prev => ({
            ...prev,
            photos: [...(prev.photos || []), { id: Date.now() + Math.random(), url: reader.result, name: file.name }]
          }));
        } else {
          setNewAsset(prev => ({
            ...prev,
            photos: [...(prev.photos || []), { id: Date.now() + Math.random(), url: reader.result, name: file.name }]
          }));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Remove photo
  const removePhoto = (photoId, isEditing = false) => {
    if (isEditing) {
      setEditingAsset(prev => ({
        ...prev,
        photos: prev.photos.filter(p => p.id !== photoId)
      }));
    } else {
      setNewAsset(prev => ({
        ...prev,
        photos: prev.photos.filter(p => p.id !== photoId)
      }));
    }
  };

  // Edit asset
  const handleEditAsset = (asset) => {
    setEditingAsset({ ...asset });
    setShowEditAsset(true);
  };

  // Save edited asset
  const handleSaveEdit = () => {
    if (!editingAsset.name || !editingAsset.purchaseCost || !editingAsset.locationId) return;
    
    setAssets(assets.map(a => {
      if (a.id === editingAsset.id) {
        return {
          ...editingAsset,
          purchaseCost: parseFloat(editingAsset.purchaseCost),
          currentValue: parseFloat(editingAsset.currentValue) || parseFloat(editingAsset.purchaseCost),
          quantity: parseInt(editingAsset.quantity),
          locationId: parseInt(editingAsset.locationId),
          depreciationRate: parseFloat(editingAsset.depreciationRate)
        };
      }
      return a;
    }));
    
    setShowEditAsset(false);
    setEditingAsset(null);
  };

  // Add new location
  const handleAddLocation = () => {
    if (!newLocation.name) return;
    setLocations([...locations, { ...newLocation, id: Date.now() }]);
    setNewLocation({ name: '', address: '' });
    setShowAddLocation(false);
  };

  // Transfer asset
  const handleTransfer = () => {
    if (!selectedAsset || !transferTo || transferQty < 1) return;
    
    const sourceAsset = assets.find(a => a.id === selectedAsset.id);
    if (transferQty > sourceAsset.quantity) return;

    const updatedAssets = assets.map(asset => {
      if (asset.id === selectedAsset.id) {
        return { ...asset, quantity: asset.quantity - transferQty };
      }
      return asset;
    }).filter(a => a.quantity > 0);

    // Check if asset already exists at destination
    const existingAtDest = assets.find(
      a => a.name === sourceAsset.name && 
           a.locationId === parseInt(transferTo) &&
           a.serialNumber === sourceAsset.serialNumber
    );

    if (existingAtDest) {
      const finalAssets = updatedAssets.map(a => {
        if (a.id === existingAtDest.id) {
          return { ...a, quantity: a.quantity + transferQty };
        }
        return a;
      });
      setAssets(finalAssets);
    } else {
      const newAssetAtDest = {
        ...sourceAsset,
        id: Date.now(),
        locationId: parseInt(transferTo),
        quantity: transferQty
      };
      setAssets([...updatedAssets, newAssetAtDest]);
    }

    setShowTransfer(false);
    setSelectedAsset(null);
    setTransferTo('');
    setTransferQty(1);
  };

  // Delete asset
  const handleDeleteAsset = (id) => {
    setAssets(assets.filter(a => a.id !== id));
  };

  // Delete location
  const handleDeleteLocation = (id) => {
    const locationAssets = assets.filter(a => a.locationId === id);
    if (locationAssets.length > 0) {
      alert(`Cannot delete location. ${locationAssets.length} asset(s) are assigned to this location. Please reassign or delete them first.`);
      return;
    }
    setLocations(locations.filter(l => l.id !== id));
  };

  // Edit location state
  const [editingLocation, setEditingLocation] = useState(null);
  const [showEditLocation, setShowEditLocation] = useState(false);

  // Edit location
  const handleEditLocation = (location) => {
    setEditingLocation({ ...location });
    setShowEditLocation(true);
  };

  // Save edited location
  const handleSaveLocationEdit = () => {
    if (!editingLocation.name) return;
    setLocations(locations.map(l => {
      if (l.id === editingLocation.id) {
        return { ...editingLocation };
      }
      return l;
    }));
    setShowEditLocation(false);
    setEditingLocation(null);
  };

  // Add new category
  const handleAddCategory = () => {
    if (!newCategory.trim()) return;
    if (categories.includes(newCategory.trim())) {
      alert('This category already exists');
      return;
    }
    setCategories([...categories, newCategory.trim()]);
    setNewCategory('');
  };

  // Delete category
  const handleDeleteCategory = (categoryName) => {
    const categoryAssets = assets.filter(a => a.category === categoryName);
    if (categoryAssets.length > 0) {
      alert(`Cannot delete category. ${categoryAssets.length} asset(s) are using this category. Please reassign them first.`);
      return;
    }
    if (categories.length <= 1) {
      alert('You must have at least one category.');
      return;
    }
    setCategories(categories.filter(c => c !== categoryName));
  };

  // Add note to asset
  const handleAddNote = (assetId) => {
    if (!newNote.trim()) return;
    
    const note = {
      id: Date.now(),
      text: newNote.trim(),
      timestamp: new Date().toISOString(),
    };
    
    setAssets(assets.map(asset => {
      if (asset.id === assetId) {
        return {
          ...asset,
          notes: [...(asset.notes || []), note]
        };
      }
      return asset;
    }));
    
    // Update the modal view with new notes
    setShowNotesModal(prev => ({
      ...prev,
      notes: [...(prev.notes || []), note]
    }));
    
    setNewNote('');
  };

  // Delete note from asset
  const handleDeleteNote = (assetId, noteId) => {
    setAssets(assets.map(asset => {
      if (asset.id === assetId) {
        return {
          ...asset,
          notes: (asset.notes || []).filter(n => n.id !== noteId)
        };
      }
      return asset;
    }));
    
    // Update the modal view
    setShowNotesModal(prev => ({
      ...prev,
      notes: (prev.notes || []).filter(n => n.id !== noteId)
    }));
  };

  // Format note timestamp
  const formatNoteTimestamp = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Toggle asset selection
  const toggleAssetSelection = (assetId) => {
    setSelectedAssets(prev => {
      if (prev.includes(assetId)) {
        return prev.filter(id => id !== assetId);
      } else {
        return [...prev, assetId];
      }
    });
  };

  // Select all filtered assets
  const selectAllAssets = () => {
    if (selectedAssets.length === filteredAssets.length) {
      setSelectedAssets([]);
    } else {
      setSelectedAssets(filteredAssets.map(a => a.id));
    }
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedAssets([]);
  };

  // Bulk transfer assets to new location
  const handleBulkTransfer = () => {
    if (!bulkTransferTo || selectedAssets.length === 0) return;
    
    const newLocationId = parseInt(bulkTransferTo);
    
    setAssets(assets.map(asset => {
      if (selectedAssets.includes(asset.id)) {
        // Add a note about the transfer
        const transferNote = {
          id: Date.now() + Math.random(),
          text: `Bulk transferred from ${getLocationName(asset.locationId)} to ${getLocationName(newLocationId)}`,
          timestamp: new Date().toISOString(),
        };
        return {
          ...asset,
          locationId: newLocationId,
          notes: [...(asset.notes || []), transferNote]
        };
      }
      return asset;
    }));
    
    setShowBulkTransfer(false);
    setBulkTransferTo('');
    setSelectedAssets([]);
  };

  // Bulk delete assets
  const handleBulkDelete = () => {
    if (selectedAssets.length === 0) return;
    
    setAssets(assets.filter(asset => !selectedAssets.includes(asset.id)));
    setShowBulkDelete(false);
    setSelectedAssets([]);
  };

  // Filter assets
  const filteredAssets = assets.filter(asset => {
    const matchesLocation = filterLocation === 'all' || asset.locationId === parseInt(filterLocation);
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          asset.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          asset.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesLocation && matchesSearch;
  });

  // Get location name
  const getLocationName = (id) => locations.find(l => l.id === id)?.name || 'Unknown';

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Generate balance sheet data
  const generateBalanceSheet = () => {
    const byCategory = {};
    const byLocation = {};

    assets.forEach(asset => {
      const totalValue = asset.currentValue * asset.quantity;
      const totalCost = asset.purchaseCost * asset.quantity;
      
      if (!byCategory[asset.category]) {
        byCategory[asset.category] = { currentValue: 0, purchaseCost: 0, count: 0 };
      }
      byCategory[asset.category].currentValue += totalValue;
      byCategory[asset.category].purchaseCost += totalCost;
      byCategory[asset.category].count += asset.quantity;

      const locName = getLocationName(asset.locationId);
      if (!byLocation[locName]) {
        byLocation[locName] = { currentValue: 0, purchaseCost: 0, count: 0 };
      }
      byLocation[locName].currentValue += totalValue;
      byLocation[locName].purchaseCost += totalCost;
      byLocation[locName].count += asset.quantity;
    });

    return { byCategory, byLocation };
  };

  const totals = calculateTotals();
  const balanceSheet = generateBalanceSheet();

  // Generate and download balance sheet as PDF-ready HTML
  const printBalanceSheet = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Kassets Balance Sheet</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
            padding: 40px; 
            color: #1a1a2e;
            background: white;
          }
          .header { 
            display: flex; 
            justify-content: space-between; 
            align-items: center;
            margin-bottom: 30px; 
            padding-bottom: 20px;
            border-bottom: 3px solid #ffd700;
          }
          .logo { font-size: 28px; font-weight: 800; color: #1a1a2e; }
          .logo span { color: #d4a000; }
          .date { color: #666; font-size: 14px; }
          h1 { font-size: 24px; margin-bottom: 5px; }
          h2 { font-size: 18px; margin: 25px 0 15px 0; color: #1a1a2e; border-bottom: 2px solid #ffd700; padding-bottom: 8px; }
          .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
          .summary-box { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #ffd700; }
          .summary-label { font-size: 12px; color: #666; text-transform: uppercase; }
          .summary-value { font-size: 24px; font-weight: 700; margin-top: 5px; }
          .summary-value.green { color: #22c55e; }
          .summary-value.red { color: #ef4444; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { background: #1a1a2e; color: white; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; }
          td { padding: 12px; border-bottom: 1px solid #eee; font-size: 14px; }
          tr:hover { background: #f8f9fa; }
          .text-right { text-align: right; }
          .font-mono { font-family: 'Monaco', 'Consolas', monospace; }
          .total-row { font-weight: 700; background: #f0f0f0; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">${companyName || 'K<span>ASSETS</span>'}</div>
            <p style="color: #666; font-size: 12px;">${companyName ? 'Asset Management by Kassets' : 'Asset Management'}</p>
          </div>
          <div class="date">
            Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
        
        <h1>${companyName ? companyName + ' - ' : ''}Asset Balance Sheet</h1>
        
        <div class="summary-grid">
          <div class="summary-box">
            <div class="summary-label">Total Assets (at cost)</div>
            <div class="summary-value">${formatCurrency(totals.totalPurchaseCost)}</div>
          </div>
          <div class="summary-box">
            <div class="summary-label">Accumulated Depreciation</div>
            <div class="summary-value red">(${formatCurrency(totals.totalPurchaseCost - totals.totalCurrentValue)})</div>
          </div>
          <div class="summary-box">
            <div class="summary-label">Net Book Value</div>
            <div class="summary-value green">${formatCurrency(totals.totalCurrentValue)}</div>
          </div>
        </div>
        
        <h2>Assets by Category</h2>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th class="text-right">Count</th>
              <th class="text-right">Purchase Cost</th>
              <th class="text-right">Current Value</th>
              <th class="text-right">Depreciation</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(balanceSheet.byCategory).map(([category, data]) => `
              <tr>
                <td>${category}</td>
                <td class="text-right font-mono">${data.count}</td>
                <td class="text-right font-mono">${formatCurrency(data.purchaseCost)}</td>
                <td class="text-right font-mono" style="color: #22c55e;">${formatCurrency(data.currentValue)}</td>
                <td class="text-right font-mono" style="color: #ef4444;">(${formatCurrency(data.purchaseCost - data.currentValue)})</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td>TOTAL</td>
              <td class="text-right font-mono">${totals.totalAssets}</td>
              <td class="text-right font-mono">${formatCurrency(totals.totalPurchaseCost)}</td>
              <td class="text-right font-mono" style="color: #22c55e;">${formatCurrency(totals.totalCurrentValue)}</td>
              <td class="text-right font-mono" style="color: #ef4444;">(${formatCurrency(totals.totalPurchaseCost - totals.totalCurrentValue)})</td>
            </tr>
          </tbody>
        </table>
        
        <h2>Assets by Location</h2>
        <table>
          <thead>
            <tr>
              <th>Location</th>
              <th class="text-right">Asset Count</th>
              <th class="text-right">Purchase Cost</th>
              <th class="text-right">Current Value</th>
              <th class="text-right">% of Total</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(balanceSheet.byLocation).map(([location, data]) => `
              <tr>
                <td>${location}</td>
                <td class="text-right font-mono">${data.count}</td>
                <td class="text-right font-mono">${formatCurrency(data.purchaseCost)}</td>
                <td class="text-right font-mono" style="color: #22c55e;">${formatCurrency(data.currentValue)}</td>
                <td class="text-right font-mono">${totals.totalCurrentValue > 0 ? ((data.currentValue / totals.totalCurrentValue) * 100).toFixed(1) : 0}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <h2>Detailed Asset Schedule</h2>
        <table>
          <thead>
            <tr>
              <th>Asset Name</th>
              <th>Serial #</th>
              <th>Location</th>
              <th class="text-right">Qty</th>
              <th>Purchase Date</th>
              <th class="text-right">Unit Cost</th>
              <th class="text-right">Total Value</th>
            </tr>
          </thead>
          <tbody>
            ${assets.map(asset => `
              <tr>
                <td>${asset.name}</td>
                <td class="font-mono" style="color: #666; font-size: 12px;">${asset.serialNumber || '-'}</td>
                <td>${getLocationName(asset.locationId)}</td>
                <td class="text-right">${asset.quantity}</td>
                <td>${formatDate(asset.purchaseDate)}</td>
                <td class="text-right font-mono">${formatCurrency(asset.purchaseCost)}</td>
                <td class="text-right font-mono" style="color: #22c55e;">${formatCurrency(asset.currentValue * asset.quantity)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p>Generated by Kassets Asset Management System</p>
        </div>
      </body>
      </html>
    `;
    
    // Open in new window for printing
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    } else {
      // Fallback: download as HTML file
      const blob = new Blob([printContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Kassets_Balance_Sheet_${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      color: '#e2e8f0'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        
        * { box-sizing: border-box; }
        
        .glass-card {
          background: rgba(30, 41, 59, 0.7);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(148, 163, 184, 0.1);
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }
        
        .btn-primary {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: inherit;
          font-size: 14px;
        }
        
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
        }
        
        .btn-secondary {
          background: rgba(71, 85, 105, 0.5);
          color: #e2e8f0;
          border: 1px solid rgba(148, 163, 184, 0.2);
          padding: 12px 24px;
          border-radius: 10px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: inherit;
          font-size: 14px;
        }
        
        .btn-secondary:hover {
          background: rgba(71, 85, 105, 0.8);
        }
        
        .btn-danger {
          background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: inherit;
          font-size: 13px;
        }
        
        .btn-danger:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
        }
        
        .input-field {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 10px;
          padding: 12px 16px;
          color: #e2e8f0;
          font-family: inherit;
          font-size: 14px;
          width: 100%;
          transition: all 0.3s ease;
        }
        
        .input-field:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
        }
        
        .input-field::placeholder {
          color: #64748b;
        }
        
        select.input-field {
          cursor: pointer;
        }
        
        .tab-btn {
          padding: 12px 24px;
          background: transparent;
          border: none;
          color: #94a3b8;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: inherit;
          font-size: 14px;
          position: relative;
        }
        
        .tab-btn.active {
          color: #3b82f6;
        }
        
        .tab-btn.active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, #3b82f6, #60a5fa);
          border-radius: 2px;
        }
        
        .tab-btn:hover {
          color: #e2e8f0;
        }
        
        .stat-card {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(30, 41, 59, 0.8) 100%);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 16px;
          padding: 24px;
          position: relative;
          overflow: hidden;
        }
        
        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 100px;
          height: 100px;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%);
        }
        
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .modal-content {
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 20px;
          padding: 32px;
          max-width: 500px;
          width: 90%;
          max-height: 85vh;
          overflow-y: auto;
          animation: slideUp 0.3s ease;
        }
        
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        .asset-row {
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(148, 163, 184, 0.1);
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 12px;
          transition: all 0.3s ease;
        }
        
        .asset-row:hover {
          background: rgba(30, 41, 59, 0.8);
          border-color: rgba(59, 130, 246, 0.3);
          transform: translateX(4px);
        }
        
        .category-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
          background: rgba(59, 130, 246, 0.2);
          color: #60a5fa;
        }
        
        .location-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
          background: rgba(16, 185, 129, 0.2);
          color: #34d399;
        }
        
        @media print {
          body * { visibility: hidden; }
          .balance-sheet-print, .balance-sheet-print * { visibility: visible; }
          .balance-sheet-print {
            position: absolute;
            left: 0;
            top: 0;
            background: white !important;
            color: black !important;
            padding: 40px;
          }
          .no-print { display: none !important; }
        }
        
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        
        .scrollbar-thin::-webkit-scrollbar-track {
          background: rgba(30, 41, 59, 0.5);
          border-radius: 3px;
        }
        
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.3);
          border-radius: 3px;
        }
        
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.5);
        }
      `}</style>

      {/* Header */}
      <header style={{
        padding: '24px 40px',
        borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Logo */}
          <svg viewBox="0 0 400 400" width="56" height="56">
            <defs>
              <linearGradient id="goldTop" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{stopColor:'#ffe566'}}/>
                <stop offset="50%" style={{stopColor:'#ffd700'}}/>
                <stop offset="100%" style={{stopColor:'#e6b800'}}/>
              </linearGradient>
              <linearGradient id="goldSide" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{stopColor:'#d4a000'}}/>
                <stop offset="50%" style={{stopColor:'#b8960b'}}/>
                <stop offset="100%" style={{stopColor:'#8b7000'}}/>
              </linearGradient>
              <linearGradient id="emblemGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{stopColor:'#ffd700'}}/>
                <stop offset="25%" style={{stopColor:'#ffec80'}}/>
                <stop offset="50%" style={{stopColor:'#f4d03f'}}/>
                <stop offset="75%" style={{stopColor:'#d4a000'}}/>
                <stop offset="100%" style={{stopColor:'#b8860b'}}/>
              </linearGradient>
              <linearGradient id="emblemEdge" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{stopColor:'#ffec80'}}/>
                <stop offset="50%" style={{stopColor:'#d4a000'}}/>
                <stop offset="100%" style={{stopColor:'#8b6914'}}/>
              </linearGradient>
              <linearGradient id="coinFaceBg" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{stopColor:'#2a2a35'}}/>
                <stop offset="50%" style={{stopColor:'#1a1a22'}}/>
                <stop offset="100%" style={{stopColor:'#12121a'}}/>
              </linearGradient>
              <linearGradient id="innerRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{stopColor:'#ffd700'}}/>
                <stop offset="100%" style={{stopColor:'#b8860b'}}/>
              </linearGradient>
            </defs>
            <circle cx="200" cy="200" r="150" fill="url(#emblemGold)"/>
            <circle cx="200" cy="200" r="150" fill="none" stroke="url(#emblemEdge)" strokeWidth="8"/>
            <circle cx="200" cy="200" r="130" fill="url(#coinFaceBg)"/>
            <circle cx="200" cy="200" r="130" fill="none" stroke="url(#innerRingGrad)" strokeWidth="3"/>
            <g transform="translate(200, 210)">
              <g transform="translate(-60, 0)">
                {[0,1,2,3,4].map(i => (
                  <g key={i}>
                    <ellipse cx="0" cy={24-i*8} rx="20" ry="8" fill="url(#goldSide)"/>
                    <ellipse cx="0" cy={20-i*8} rx="20" ry="8" fill="url(#goldTop)"/>
                  </g>
                ))}
              </g>
              <g transform="translate(-20, -8)">
                {[0,1,2,3,4,5,6].map(i => (
                  <g key={i}>
                    <ellipse cx="0" cy={24-i*8} rx="20" ry="8" fill="url(#goldSide)"/>
                    <ellipse cx="0" cy={20-i*8} rx="20" ry="8" fill="url(#goldTop)"/>
                  </g>
                ))}
              </g>
              <g transform="translate(20, -16)">
                {[0,1,2,3,4,5,6,7,8].map(i => (
                  <g key={i}>
                    <ellipse cx="0" cy={24-i*8} rx="20" ry="8" fill="url(#goldSide)"/>
                    <ellipse cx="0" cy={20-i*8} rx="20" ry="8" fill="url(#goldTop)"/>
                  </g>
                ))}
              </g>
              <g transform="translate(60, -24)">
                {[0,1,2,3,4,5,6,7,8,9,10].map(i => (
                  <g key={i}>
                    <ellipse cx="0" cy={24-i*8} rx="20" ry="8" fill="url(#goldSide)"/>
                    <ellipse cx="0" cy={20-i*8} rx="20" ry="8" fill="url(#goldTop)"/>
                  </g>
                ))}
              </g>
            </g>
          </svg>
          <div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: '700',
              margin: 0,
              background: 'linear-gradient(135deg, #ffd700 0%, #ffec80 50%, #d4a000 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              {companyName || 'KASSETS'}
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b' }}>
              {companyName ? 'Asset Management' : 'Asset Management'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn-secondary" 
            onClick={() => setShowSettings(true)}
            style={{ padding: '12px 16px' }}
            title="Settings"
          >
            ⚙️
          </button>
          <button className="btn-secondary" onClick={() => setShowManageCategories(true)}>
            Categories
          </button>
          <button className="btn-secondary" onClick={() => setShowAddLocation(true)}>
            + Add Location
          </button>
          <button className="btn-primary" onClick={() => setShowAddAsset(true)}>
            + Add Asset
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav style={{
        padding: '0 40px',
        borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
        display: 'flex',
        gap: '8px'
      }}>
        <button 
          className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
        <button 
          className={`tab-btn ${activeTab === 'assets' ? 'active' : ''}`}
          onClick={() => setActiveTab('assets')}
        >
          Assets
        </button>
        <button 
          className={`tab-btn ${activeTab === 'locations' ? 'active' : ''}`}
          onClick={() => setActiveTab('locations')}
        >
          Locations
        </button>
        <button 
          className={`tab-btn ${activeTab === 'balance-sheet' ? 'active' : ''}`}
          onClick={() => setActiveTab('balance-sheet')}
        >
          Balance Sheet
        </button>
      </nav>

      {/* Main Content */}
      <main style={{ padding: '32px 40px' }}>
        
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div>
            {/* Stats Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '24px',
              marginBottom: '32px'
            }}>
              <div className="stat-card">
                <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>
                  Total Assets
                </p>
                <p style={{ 
                  margin: 0, 
                  fontSize: '36px', 
                  fontWeight: '700',
                  fontFamily: "'JetBrains Mono', monospace"
                }}>
                  {totals.totalAssets}
                </p>
                <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                  Across {locations.length} locations
                </p>
              </div>
              
              <div className="stat-card" style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(30, 41, 59, 0.8) 100%)',
                borderColor: 'rgba(16, 185, 129, 0.2)'
              }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>
                  Current Value
                </p>
                <p style={{ 
                  margin: 0, 
                  fontSize: '36px', 
                  fontWeight: '700',
                  fontFamily: "'JetBrains Mono', monospace",
                  color: '#34d399'
                }}>
                  {formatCurrency(totals.totalCurrentValue)}
                </p>
                <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                  Total depreciated value
                </p>
              </div>
              
              <div className="stat-card" style={{
                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(30, 41, 59, 0.8) 100%)',
                borderColor: 'rgba(251, 191, 36, 0.2)'
              }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>
                  Purchase Cost
                </p>
                <p style={{ 
                  margin: 0, 
                  fontSize: '36px', 
                  fontWeight: '700',
                  fontFamily: "'JetBrains Mono', monospace",
                  color: '#fbbf24'
                }}>
                  {formatCurrency(totals.totalPurchaseCost)}
                </p>
                <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                  Original investment
                </p>
              </div>
              
              <div className="stat-card" style={{
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(30, 41, 59, 0.8) 100%)',
                borderColor: 'rgba(239, 68, 68, 0.2)'
              }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>
                  Total Depreciation
                </p>
                <p style={{ 
                  margin: 0, 
                  fontSize: '36px', 
                  fontWeight: '700',
                  fontFamily: "'JetBrains Mono', monospace",
                  color: '#f87171'
                }}>
                  {formatCurrency(totals.totalPurchaseCost - totals.totalCurrentValue)}
                </p>
                <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                  Accumulated depreciation
                </p>
              </div>
            </div>

            {/* Quick Overview */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div className="glass-card" style={{ padding: '24px' }}>
                <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600' }}>
                  Assets by Category
                </h3>
                {Object.entries(balanceSheet.byCategory).map(([category, data]) => (
                  <div key={category} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 0',
                    borderBottom: '1px solid rgba(148, 163, 184, 0.1)'
                  }}>
                    <span className="category-badge">{category}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#34d399' }}>
                      {formatCurrency(data.currentValue)}
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="glass-card" style={{ padding: '24px' }}>
                <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600' }}>
                  Assets by Location
                </h3>
                {Object.entries(balanceSheet.byLocation).map(([location, data]) => (
                  <div key={location} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 0',
                    borderBottom: '1px solid rgba(148, 163, 184, 0.1)'
                  }}>
                    <span className="location-badge">{location}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#34d399' }}>
                      {formatCurrency(data.currentValue)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Assets Tab */}
        {activeTab === 'assets' && (
          <div>
            {/* Filters */}
            <div style={{
              display: 'flex',
              gap: '16px',
              marginBottom: '24px',
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
              <input
                type="text"
                placeholder="Search assets..."
                className="input-field"
                style={{ maxWidth: '300px' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <select
                className="input-field"
                style={{ maxWidth: '200px' }}
                value={filterLocation}
                onChange={(e) => {
                  setFilterLocation(e.target.value);
                  setSelectedAssets([]); // Clear selection when changing filter
                }}
              >
                <option value="all">All Locations</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
              
              {/* Select Buttons */}
              {filteredAssets.length > 0 && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn-secondary"
                    style={{ padding: '10px 16px', fontSize: '13px' }}
                    onClick={selectAllAssets}
                  >
                    {selectedAssets.length === filteredAssets.length && filteredAssets.length > 0 
                      ? '☑ Deselect All' 
                      : filterLocation === 'all' 
                        ? '☐ Select All' 
                        : `☐ Select All in ${getLocationName(parseInt(filterLocation))}`}
                  </button>
                  {filterLocation !== 'all' && selectedAssets.length > 0 && (
                    <button
                      className="btn-secondary"
                      style={{ padding: '10px 16px', fontSize: '13px' }}
                      onClick={clearSelection}
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Location Quick Select Bar */}
            {assets.length > 0 && (
              <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '16px',
                flexWrap: 'wrap',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '13px', color: '#64748b', marginRight: '8px' }}>Quick select:</span>
                <button
                  className="btn-secondary"
                  style={{ 
                    padding: '6px 12px', 
                    fontSize: '12px',
                    background: filterLocation === 'all' && selectedAssets.length === assets.length 
                      ? 'rgba(59, 130, 246, 0.3)' 
                      : undefined
                  }}
                  onClick={() => {
                    setFilterLocation('all');
                    setSelectedAssets(assets.map(a => a.id));
                  }}
                >
                  All Assets ({assets.length})
                </button>
                {locations.map(loc => {
                  const locationAssetIds = assets.filter(a => a.locationId === loc.id).map(a => a.id);
                  const isAllSelected = locationAssetIds.length > 0 && 
                    locationAssetIds.every(id => selectedAssets.includes(id));
                  return (
                    <button
                      key={loc.id}
                      className="btn-secondary"
                      style={{ 
                        padding: '6px 12px', 
                        fontSize: '12px',
                        background: isAllSelected ? 'rgba(59, 130, 246, 0.3)' : undefined
                      }}
                      onClick={() => {
                        if (isAllSelected) {
                          // Deselect all from this location
                          setSelectedAssets(selectedAssets.filter(id => !locationAssetIds.includes(id)));
                        } else {
                          // Select all from this location (add to existing selection)
                          const newSelection = [...new Set([...selectedAssets, ...locationAssetIds])];
                          setSelectedAssets(newSelection);
                        }
                      }}
                    >
                      {loc.name} ({locationAssetIds.length})
                    </button>
                  );
                })}
                {selectedAssets.length > 0 && (
                  <button
                    className="btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '12px', marginLeft: '8px' }}
                    onClick={clearSelection}
                  >
                    ✕ Clear All
                  </button>
                )}
              </div>
            )}

            {/* Bulk Action Bar */}
            {selectedAssets.length > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px 20px',
                marginBottom: '16px',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(30, 41, 59, 0.9) 100%)',
                borderRadius: '12px',
                border: '1px solid rgba(59, 130, 246, 0.3)'
              }}>
                <span style={{ fontSize: '14px', fontWeight: '600' }}>
                  {selectedAssets.length} asset{selectedAssets.length !== 1 ? 's' : ''} selected
                </span>
                <button
                  className="btn-primary"
                  style={{ padding: '10px 20px', fontSize: '13px' }}
                  onClick={() => setShowBulkTransfer(true)}
                >
                  📍 Change Location
                </button>
                <button
                  className="btn-danger"
                  style={{ padding: '10px 20px', fontSize: '13px' }}
                  onClick={() => setShowBulkDelete(true)}
                >
                  🗑️ Delete Selected
                </button>
                <button
                  className="btn-secondary"
                  style={{ padding: '10px 16px', fontSize: '13px' }}
                  onClick={clearSelection}
                >
                  Clear Selection
                </button>
              </div>
            )}

            {/* Asset List */}
            <div className="scrollbar-thin" style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {filteredAssets.length === 0 ? (
                <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
                  <p style={{ color: '#64748b', margin: 0 }}>No assets found. Add your first asset to get started.</p>
                </div>
              ) : (
                filteredAssets.map(asset => (
                  <div 
                    key={asset.id} 
                    className="asset-row"
                    style={{
                      border: selectedAssets.includes(asset.id) 
                        ? '1px solid rgba(59, 130, 246, 0.5)' 
                        : undefined,
                      background: selectedAssets.includes(asset.id)
                        ? 'rgba(59, 130, 246, 0.1)'
                        : undefined
                    }}
                  >
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'auto 2fr 1fr 1fr 1fr 1fr auto',
                      gap: '16px',
                      alignItems: 'center'
                    }}>
                      {/* Checkbox */}
                      <div 
                        onClick={() => toggleAssetSelection(asset.id)}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          border: selectedAssets.includes(asset.id) 
                            ? '2px solid #3b82f6' 
                            : '2px solid #475569',
                          background: selectedAssets.includes(asset.id) 
                            ? '#3b82f6' 
                            : 'transparent',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {selectedAssets.includes(asset.id) && (
                          <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>✓</span>
                        )}
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                          {asset.name}
                        </h4>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                          {asset.serialNumber && `SN: ${asset.serialNumber} • `}
                          {asset.description}
                        </p>
                      </div>
                      <div>
                        <span className="category-badge">{asset.category}</span>
                      </div>
                      <div>
                        <span className="location-badge">{getLocationName(asset.locationId)}</span>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>
                          {asset.quantity}
                        </p>
                        <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Qty</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ 
                          margin: 0, 
                          fontSize: '16px', 
                          fontWeight: '600',
                          fontFamily: "'JetBrains Mono', monospace",
                          color: '#34d399'
                        }}>
                          {formatCurrency(asset.currentValue * asset.quantity)}
                        </p>
                        <p style={{ 
                          margin: 0, 
                          fontSize: '12px', 
                          color: '#64748b',
                          fontFamily: "'JetBrains Mono', monospace"
                        }}>
                          Cost: {formatCurrency(asset.purchaseCost * asset.quantity)}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {asset.photos && asset.photos.length > 0 && (
                          <button
                            className="btn-secondary"
                            style={{ padding: '8px 12px', fontSize: '13px' }}
                            onClick={() => setShowPhotoViewer(asset)}
                            title="View photos"
                          >
                            📷 {asset.photos.length}
                          </button>
                        )}
                        <button
                          className="btn-secondary"
                          style={{ 
                            padding: '8px 12px', 
                            fontSize: '13px',
                            background: (asset.notes && asset.notes.length > 0) ? 'rgba(251, 191, 36, 0.2)' : undefined,
                            borderColor: (asset.notes && asset.notes.length > 0) ? 'rgba(251, 191, 36, 0.4)' : undefined
                          }}
                          onClick={() => setShowNotesModal(asset)}
                          title="View/Add notes"
                        >
                          📝 {asset.notes && asset.notes.length > 0 ? asset.notes.length : ''}
                        </button>
                        <button 
                          className="btn-secondary"
                          style={{ padding: '8px 16px', fontSize: '13px' }}
                          onClick={() => handleEditAsset(asset)}
                        >
                          Edit
                        </button>
                        <button 
                          className="btn-secondary"
                          style={{ padding: '8px 16px', fontSize: '13px' }}
                          onClick={() => {
                            setSelectedAsset(asset);
                            setShowTransfer(true);
                          }}
                        >
                          Transfer
                        </button>
                        <button 
                          className="btn-danger"
                          onClick={() => handleDeleteAsset(asset.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Locations Tab */}
        {activeTab === 'locations' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '24px'
          }}>
            {locations.map(location => {
              const locationAssets = assets.filter(a => a.locationId === location.id);
              const locationValue = locationAssets.reduce((sum, a) => sum + (a.currentValue * a.quantity), 0);
              const assetCount = locationAssets.reduce((sum, a) => sum + a.quantity, 0);
              
              return (
                <div key={location.id} className="glass-card" style={{ padding: '24px' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '600' }}>
                    {location.name}
                  </h3>
                  <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#64748b' }}>
                    {location.address || 'No address specified'}
                  </p>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '16px',
                    marginBottom: '20px'
                  }}>
                    <div style={{
                      background: 'rgba(15, 23, 42, 0.5)',
                      borderRadius: '12px',
                      padding: '16px'
                    }}>
                      <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Assets</p>
                      <p style={{ margin: '4px 0 0 0', fontSize: '24px', fontWeight: '700' }}>
                        {assetCount}
                      </p>
                    </div>
                    <div style={{
                      background: 'rgba(15, 23, 42, 0.5)',
                      borderRadius: '12px',
                      padding: '16px'
                    }}>
                      <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Value</p>
                      <p style={{ 
                        margin: '4px 0 0 0', 
                        fontSize: '20px', 
                        fontWeight: '700',
                        fontFamily: "'JetBrains Mono', monospace",
                        color: '#34d399'
                      }}>
                        {formatCurrency(locationValue)}
                      </p>
                    </div>
                  </div>
                  
                  {locationAssets.length > 0 && (
                    <div>
                      <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>
                        ASSETS AT THIS LOCATION
                      </p>
                      {locationAssets.slice(0, 5).map(asset => (
                        <div key={asset.id} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '8px 0',
                          borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                          fontSize: '14px'
                        }}>
                          <span>{asset.name} ({asset.quantity})</span>
                          <span style={{ color: '#34d399', fontFamily: "'JetBrains Mono', monospace" }}>
                            {formatCurrency(asset.currentValue * asset.quantity)}
                          </span>
                        </div>
                      ))}
                      {locationAssets.length > 5 && (
                        <p style={{ margin: '12px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                          +{locationAssets.length - 5} more assets
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Location Action Buttons */}
                  <div style={{ 
                    display: 'flex', 
                    gap: '8px', 
                    marginTop: '16px',
                    paddingTop: '16px',
                    borderTop: '1px solid rgba(148, 163, 184, 0.1)'
                  }}>
                    <button 
                      className="btn-secondary"
                      style={{ flex: 1, padding: '10px 16px', fontSize: '13px' }}
                      onClick={() => handleEditLocation(location)}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn-danger"
                      style={{ flex: 1, padding: '10px 16px', fontSize: '13px' }}
                      onClick={() => handleDeleteLocation(location.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Balance Sheet Tab */}
        {activeTab === 'balance-sheet' && (
          <div className="balance-sheet-print">
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '32px'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>
                  Asset Balance Sheet
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b' }}>
                  Generated on {new Date().toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              <button className="btn-primary no-print" onClick={printBalanceSheet}>
                Print / Export PDF
              </button>
            </div>

            {/* Summary Section */}
            <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600', borderBottom: '2px solid #3b82f6', paddingBottom: '12px' }}>
                ASSET SUMMARY
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '32px' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>Total Fixed Assets (at cost)</p>
                  <p style={{ margin: '8px 0 0 0', fontSize: '28px', fontWeight: '700', fontFamily: "'JetBrains Mono', monospace" }}>
                    {formatCurrency(totals.totalPurchaseCost)}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>Less: Accumulated Depreciation</p>
                  <p style={{ margin: '8px 0 0 0', fontSize: '28px', fontWeight: '700', fontFamily: "'JetBrains Mono', monospace", color: '#f87171' }}>
                    ({formatCurrency(totals.totalPurchaseCost - totals.totalCurrentValue)})
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>Net Book Value</p>
                  <p style={{ margin: '8px 0 0 0', fontSize: '28px', fontWeight: '700', fontFamily: "'JetBrains Mono', monospace", color: '#34d399' }}>
                    {formatCurrency(totals.totalCurrentValue)}
                  </p>
                </div>
              </div>
            </div>

            {/* By Category */}
            <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600', borderBottom: '2px solid #3b82f6', paddingBottom: '12px' }}>
                ASSETS BY CATEGORY
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.2)' }}>
                    <th style={{ textAlign: 'left', padding: '12px 0', fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>Category</th>
                    <th style={{ textAlign: 'right', padding: '12px 0', fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>Count</th>
                    <th style={{ textAlign: 'right', padding: '12px 0', fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>Purchase Cost</th>
                    <th style={{ textAlign: 'right', padding: '12px 0', fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>Current Value</th>
                    <th style={{ textAlign: 'right', padding: '12px 0', fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>Depreciation</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(balanceSheet.byCategory).map(([category, data]) => (
                    <tr key={category} style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                      <td style={{ padding: '16px 0', fontWeight: '500' }}>{category}</td>
                      <td style={{ padding: '16px 0', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>{data.count}</td>
                      <td style={{ padding: '16px 0', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>{formatCurrency(data.purchaseCost)}</td>
                      <td style={{ padding: '16px 0', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", color: '#34d399' }}>{formatCurrency(data.currentValue)}</td>
                      <td style={{ padding: '16px 0', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", color: '#f87171' }}>({formatCurrency(data.purchaseCost - data.currentValue)})</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid rgba(148, 163, 184, 0.3)' }}>
                    <td style={{ padding: '16px 0', fontWeight: '700' }}>TOTAL</td>
                    <td style={{ padding: '16px 0', textAlign: 'right', fontWeight: '700', fontFamily: "'JetBrains Mono', monospace" }}>{totals.totalAssets}</td>
                    <td style={{ padding: '16px 0', textAlign: 'right', fontWeight: '700', fontFamily: "'JetBrains Mono', monospace" }}>{formatCurrency(totals.totalPurchaseCost)}</td>
                    <td style={{ padding: '16px 0', textAlign: 'right', fontWeight: '700', fontFamily: "'JetBrains Mono', monospace", color: '#34d399' }}>{formatCurrency(totals.totalCurrentValue)}</td>
                    <td style={{ padding: '16px 0', textAlign: 'right', fontWeight: '700', fontFamily: "'JetBrains Mono', monospace", color: '#f87171' }}>({formatCurrency(totals.totalPurchaseCost - totals.totalCurrentValue)})</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* By Location */}
            <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600', borderBottom: '2px solid #3b82f6', paddingBottom: '12px' }}>
                ASSETS BY LOCATION
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.2)' }}>
                    <th style={{ textAlign: 'left', padding: '12px 0', fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>Location</th>
                    <th style={{ textAlign: 'right', padding: '12px 0', fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>Asset Count</th>
                    <th style={{ textAlign: 'right', padding: '12px 0', fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>Purchase Cost</th>
                    <th style={{ textAlign: 'right', padding: '12px 0', fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>Current Value</th>
                    <th style={{ textAlign: 'right', padding: '12px 0', fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>% of Total Value</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(balanceSheet.byLocation).map(([location, data]) => (
                    <tr key={location} style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                      <td style={{ padding: '16px 0', fontWeight: '500' }}>{location}</td>
                      <td style={{ padding: '16px 0', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>{data.count}</td>
                      <td style={{ padding: '16px 0', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>{formatCurrency(data.purchaseCost)}</td>
                      <td style={{ padding: '16px 0', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", color: '#34d399' }}>{formatCurrency(data.currentValue)}</td>
                      <td style={{ padding: '16px 0', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>
                        {totals.totalCurrentValue > 0 ? ((data.currentValue / totals.totalCurrentValue) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Detailed Asset Schedule */}
            <div className="glass-card" style={{ padding: '24px' }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600', borderBottom: '2px solid #3b82f6', paddingBottom: '12px' }}>
                DETAILED ASSET SCHEDULE
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.2)' }}>
                    <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>Asset Name</th>
                    <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>Serial #</th>
                    <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>Location</th>
                    <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>Qty</th>
                    <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>Purchase Date</th>
                    <th style={{ textAlign: 'right', padding: '12px 8px', fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>Unit Cost</th>
                    <th style={{ textAlign: 'right', padding: '12px 8px', fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>Total Cost</th>
                    <th style={{ textAlign: 'right', padding: '12px 8px', fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>Current Value</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map(asset => (
                    <tr key={asset.id} style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                      <td style={{ padding: '12px 8px' }}>{asset.name}</td>
                      <td style={{ padding: '12px 8px', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#94a3b8' }}>{asset.serialNumber || '-'}</td>
                      <td style={{ padding: '12px 8px' }}>{getLocationName(asset.locationId)}</td>
                      <td style={{ padding: '12px 8px', textAlign: 'center' }}>{asset.quantity}</td>
                      <td style={{ padding: '12px 8px' }}>{formatDate(asset.purchaseDate)}</td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>{formatCurrency(asset.purchaseCost)}</td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>{formatCurrency(asset.purchaseCost * asset.quantity)}</td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", color: '#34d399' }}>{formatCurrency(asset.currentValue * asset.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Add Asset Modal */}
      {showAddAsset && (
        <div className="modal-overlay" onClick={() => setShowAddAsset(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '22px', fontWeight: '700' }}>
              Add New Asset
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8' }}>
                  Asset Name *
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g., Dell PowerEdge Server"
                  value={newAsset.name}
                  onChange={e => setNewAsset({...newAsset, name: e.target.value})}
                />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8' }}>
                    Category
                  </label>
                  <select
                    className="input-field"
                    value={newAsset.category}
                    onChange={e => setNewAsset({...newAsset, category: e.target.value})}
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8' }}>
                    Location *
                  </label>
                  <select
                    className="input-field"
                    value={newAsset.locationId}
                    onChange={e => setNewAsset({...newAsset, locationId: e.target.value})}
                  >
                    <option value="">Select location</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8' }}>
                    Purchase Cost *
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="0.00"
                    value={newAsset.purchaseCost}
                    onChange={e => setNewAsset({...newAsset, purchaseCost: e.target.value})}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8' }}>
                    Current Value
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="Same as purchase cost"
                    value={newAsset.currentValue}
                    onChange={e => setNewAsset({...newAsset, currentValue: e.target.value})}
                  />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8' }}>
                    Quantity
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    min="1"
                    value={newAsset.quantity}
                    onChange={e => setNewAsset({...newAsset, quantity: e.target.value})}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8' }}>
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    className="input-field"
                    value={newAsset.purchaseDate}
                    onChange={e => setNewAsset({...newAsset, purchaseDate: e.target.value})}
                  />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8' }}>
                    Serial Number
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Optional"
                    value={newAsset.serialNumber}
                    onChange={e => setNewAsset({...newAsset, serialNumber: e.target.value})}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8' }}>
                    Depreciation Rate (%)
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    min="0"
                    max="100"
                    value={newAsset.depreciationRate}
                    onChange={e => setNewAsset({...newAsset, depreciationRate: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8' }}>
                  Description
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Brief description of the asset"
                  value={newAsset.description}
                  onChange={e => setNewAsset({...newAsset, description: e.target.value})}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8' }}>
                  Photos (up to 5)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handlePhotoUpload(e, false)}
                  style={{ display: 'none' }}
                  id="photo-upload-new"
                />
                <label 
                  htmlFor="photo-upload-new"
                  style={{
                    display: 'inline-block',
                    padding: '10px 20px',
                    background: 'rgba(59, 130, 246, 0.2)',
                    border: '1px dashed rgba(59, 130, 246, 0.5)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#60a5fa',
                    transition: 'all 0.3s ease'
                  }}
                >
                  📷 Upload Photos ({newAsset.photos?.length || 0}/5)
                </label>
                
                {newAsset.photos && newAsset.photos.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                    {newAsset.photos.map(photo => (
                      <div key={photo.id} style={{ position: 'relative' }}>
                        <img 
                          src={photo.url} 
                          alt={photo.name}
                          style={{
                            width: '60px',
                            height: '60px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            border: '1px solid rgba(148, 163, 184, 0.2)'
                          }}
                        />
                        <button
                          onClick={() => removePhoto(photo.id, false)}
                          style={{
                            position: 'absolute',
                            top: '-6px',
                            right: '-6px',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: '#ef4444',
                            border: 'none',
                            color: 'white',
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setShowAddAsset(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleAddAsset}>
                Add Asset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Location Modal */}
      {showAddLocation && (
        <div className="modal-overlay" onClick={() => setShowAddLocation(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '22px', fontWeight: '700' }}>
              Add New Location
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8' }}>
                  Location Name *
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g., Warehouse B"
                  value={newLocation.name}
                  onChange={e => setNewLocation({...newLocation, name: e.target.value})}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8' }}>
                  Address
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Optional"
                  value={newLocation.address}
                  onChange={e => setNewLocation({...newLocation, address: e.target.value})}
                />
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setShowAddLocation(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleAddLocation}>
                Add Location
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Asset Modal */}
      {showTransfer && selectedAsset && (
        <div className="modal-overlay" onClick={() => { setShowTransfer(false); setSelectedAsset(null); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '22px', fontWeight: '700' }}>
              Transfer Asset
            </h2>
            
            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <p style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>{selectedAsset.name}</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                Current location: {getLocationName(selectedAsset.locationId)} • Available qty: {selectedAsset.quantity}
              </p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8' }}>
                  Transfer to Location *
                </label>
                <select
                  className="input-field"
                  value={transferTo}
                  onChange={e => setTransferTo(e.target.value)}
                >
                  <option value="">Select destination</option>
                  {locations.filter(l => l.id !== selectedAsset.locationId).map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8' }}>
                  Quantity to Transfer
                </label>
                <input
                  type="number"
                  className="input-field"
                  min="1"
                  max={selectedAsset.quantity}
                  value={transferQty}
                  onChange={e => setTransferQty(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => { setShowTransfer(false); setSelectedAsset(null); }}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleTransfer}>
                Transfer Asset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Asset Modal */}
      {showEditAsset && editingAsset && (
        <div className="modal-overlay" onClick={() => { setShowEditAsset(false); setEditingAsset(null); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '550px' }}>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '22px', fontWeight: '700' }}>
              Edit Asset
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8' }}>
                  Asset Name *
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={editingAsset.name}
                  onChange={e => setEditingAsset({...editingAsset, name: e.target.value})}
                />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8' }}>
                    Category
                  </label>
                  <select
                    className="input-field"
                    value={editingAsset.category}
                    onChange={e => setEditingAsset({...editingAsset, category: e.target.value})}
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8' }}>
                    Location *
                  </label>
                  <select
                    className="input-field"
                    value={editingAsset.locationId}
                    onChange={e => setEditingAsset({...editingAsset, locationId: e.target.value})}
                  >
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8' }}>
                    Purchase Cost *
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    value={editingAsset.purchaseCost}
                    onChange={e => setEditingAsset({...editingAsset, purchaseCost: e.target.value})}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8' }}>
                    Current Value
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    value={editingAsset.currentValue}
                    onChange={e => setEditingAsset({...editingAsset, currentValue: e.target.value})}
                  />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8' }}>
                    Quantity
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    min="1"
                    value={editingAsset.quantity}
                    onChange={e => setEditingAsset({...editingAsset, quantity: e.target.value})}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8' }}>
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    className="input-field"
                    value={editingAsset.purchaseDate}
                    onChange={e => setEditingAsset({...editingAsset, purchaseDate: e.target.value})}
                  />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8' }}>
                    Serial Number
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={editingAsset.serialNumber}
                    onChange={e => setEditingAsset({...editingAsset, serialNumber: e.target.value})}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8' }}>
                    Depreciation Rate (%)
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    min="0"
                    max="100"
                    value={editingAsset.depreciationRate}
                    onChange={e => setEditingAsset({...editingAsset, depreciationRate: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8' }}>
                  Description
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={editingAsset.description}
                  onChange={e => setEditingAsset({...editingAsset, description: e.target.value})}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8' }}>
                  Photos (up to 5)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handlePhotoUpload(e, true)}
                  style={{ display: 'none' }}
                  id="photo-upload-edit"
                />
                <label 
                  htmlFor="photo-upload-edit"
                  style={{
                    display: 'inline-block',
                    padding: '10px 20px',
                    background: 'rgba(59, 130, 246, 0.2)',
                    border: '1px dashed rgba(59, 130, 246, 0.5)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#60a5fa',
                    transition: 'all 0.3s ease'
                  }}
                >
                  📷 Upload Photos ({editingAsset.photos?.length || 0}/5)
                </label>
                
                {editingAsset.photos && editingAsset.photos.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                    {editingAsset.photos.map(photo => (
                      <div key={photo.id} style={{ position: 'relative' }}>
                        <img 
                          src={photo.url} 
                          alt={photo.name}
                          style={{
                            width: '60px',
                            height: '60px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            border: '1px solid rgba(148, 163, 184, 0.2)'
                          }}
                        />
                        <button
                          onClick={() => removePhoto(photo.id, true)}
                          style={{
                            position: 'absolute',
                            top: '-6px',
                            right: '-6px',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: '#ef4444',
                            border: 'none',
                            color: 'white',
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => { setShowEditAsset(false); setEditingAsset(null); }}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSaveEdit}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Viewer Modal */}
      {showPhotoViewer && (
        <div className="modal-overlay" onClick={() => setShowPhotoViewer(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '22px', fontWeight: '700' }}>
              📷 Photos - {showPhotoViewer.name}
            </h2>
            
            {(!showPhotoViewer.photos || showPhotoViewer.photos.length === 0) ? (
              <div style={{
                padding: '40px',
                textAlign: 'center',
                background: 'rgba(15, 23, 42, 0.5)',
                borderRadius: '12px'
              }}>
                <p style={{ margin: 0, color: '#64748b' }}>No photos available</p>
              </div>
            ) : (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                gap: '16px' 
              }}>
                {showPhotoViewer.photos.map(photo => (
                  <div key={photo.id} style={{
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    background: 'rgba(15, 23, 42, 0.5)'
                  }}>
                    <div 
                      style={{
                        position: 'relative',
                        cursor: 'pointer'
                      }}
                      onClick={() => setFullscreenPhoto(photo)}
                    >
                      <img 
                        src={photo.url} 
                        alt={photo.name}
                        style={{
                          width: '100%',
                          height: '180px',
                          objectFit: 'cover',
                          display: 'block',
                          transition: 'transform 0.3s ease'
                        }}
                        onMouseOver={e => e.target.style.transform = 'scale(1.05)'}
                        onMouseOut={e => e.target.style.transform = 'scale(1)'}
                      />
                      <div style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: 'rgba(0,0,0,0.6)',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        color: 'white'
                      }}>
                        🔍 Click to enlarge
                      </div>
                    </div>
                    <div style={{
                      padding: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <p style={{
                        margin: 0,
                        fontSize: '12px',
                        color: '#94a3b8',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flex: 1
                      }}>
                        {photo.name}
                      </p>
                      <a
                        href={photo.url}
                        download={photo.name || 'photo.jpg'}
                        onClick={e => e.stopPropagation()}
                        style={{
                          padding: '6px 10px',
                          background: 'rgba(59, 130, 246, 0.2)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          borderRadius: '6px',
                          color: '#60a5fa',
                          fontSize: '11px',
                          textDecoration: 'none',
                          fontWeight: '500',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        ⬇ Download
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setShowPhotoViewer(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Photo Modal */}
      {fullscreenPhoto && (
        <div 
          className="modal-overlay" 
          onClick={() => setFullscreenPhoto(null)}
          style={{
            background: 'rgba(0, 0, 0, 0.95)',
            zIndex: 2000
          }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '95vw',
              maxHeight: '95vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setFullscreenPhoto(null)}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                color: 'white',
                fontSize: '20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>
            
            {/* Main image */}
            <img 
              src={fullscreenPhoto.url} 
              alt={fullscreenPhoto.name}
              style={{
                maxWidth: '100%',
                maxHeight: 'calc(95vh - 80px)',
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
              }}
            />
            
            {/* Bottom bar with filename and download */}
            <div style={{
              marginTop: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              background: 'rgba(30, 41, 59, 0.9)',
              padding: '12px 20px',
              borderRadius: '10px'
            }}>
              <span style={{ color: '#e2e8f0', fontSize: '14px' }}>
                {fullscreenPhoto.name}
              </span>
              <a
                href={fullscreenPhoto.url}
                download={fullscreenPhoto.name || 'photo.jpg'}
                style={{
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '13px',
                  textDecoration: 'none',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                ⬇ Download Full Size
              </a>
            </div>
            
            {/* Navigation hint */}
            <p style={{ 
              marginTop: '12px', 
              color: '#64748b', 
              fontSize: '12px' 
            }}>
              Click outside or press ✕ to close
            </p>
          </div>
        </div>
      )}

      {/* Edit Location Modal */}
      {showEditLocation && editingLocation && (
        <div className="modal-overlay" onClick={() => { setShowEditLocation(false); setEditingLocation(null); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '22px', fontWeight: '700' }}>
              Edit Location
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8' }}>
                  Location Name *
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={editingLocation.name}
                  onChange={e => setEditingLocation({...editingLocation, name: e.target.value})}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#94a3b8' }}>
                  Address
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={editingLocation.address || ''}
                  onChange={e => setEditingLocation({...editingLocation, address: e.target.value})}
                />
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => { setShowEditLocation(false); setEditingLocation(null); }}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSaveLocationEdit}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Categories Modal */}
      {showManageCategories && (
        <div className="modal-overlay" onClick={() => setShowManageCategories(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '22px', fontWeight: '700' }}>
              Manage Categories
            </h2>
            
            {/* Add new category */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              <input
                type="text"
                className="input-field"
                placeholder="New category name"
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleAddCategory()}
                style={{ flex: 1 }}
              />
              <button className="btn-primary" onClick={handleAddCategory}>
                Add
              </button>
            </div>
            
            {/* Category list */}
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {categories.map(category => {
                const categoryAssetCount = assets.filter(a => a.category === category).length;
                return (
                  <div key={category} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: 'rgba(15, 23, 42, 0.5)',
                    borderRadius: '10px',
                    marginBottom: '8px'
                  }}>
                    <div>
                      <span style={{ fontSize: '15px', fontWeight: '500' }}>{category}</span>
                      <span style={{ 
                        marginLeft: '12px', 
                        fontSize: '12px', 
                        color: '#64748b',
                        background: 'rgba(148, 163, 184, 0.1)',
                        padding: '2px 8px',
                        borderRadius: '10px'
                      }}>
                        {categoryAssetCount} asset{categoryAssetCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <button 
                      className="btn-danger"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => handleDeleteCategory(category)}
                    >
                      Delete
                    </button>
                  </div>
                );
              })}
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setShowManageCategories(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '22px', fontWeight: '700' }}>
              ⚙️ Settings
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#94a3b8', fontWeight: '500' }}>
                  Company Name
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Enter your company name"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                />
                <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                  This will appear in the header and on exported balance sheets
                </p>
              </div>
              
              <div style={{
                background: 'rgba(15, 23, 42, 0.5)',
                borderRadius: '12px',
                padding: '16px'
              }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>
                  PREVIEW
                </p>
                <p style={{ 
                  margin: 0, 
                  fontSize: '20px', 
                  fontWeight: '700',
                  background: 'linear-gradient(135deg, #ffd700 0%, #ffec80 50%, #d4a000 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  {companyName || 'KASSETS'}
                </p>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                  Asset Management
                </p>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setShowSettings(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {showNotesModal && (
        <div className="modal-overlay" onClick={() => { setShowNotesModal(null); setNewNote(''); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '550px' }}>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '22px', fontWeight: '700' }}>
              📝 Notes
            </h2>
            <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#94a3b8' }}>
              {showNotesModal.name}
            </p>
            
            {/* Add new note */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>
                Add a Note
              </label>
              <textarea
                className="input-field"
                placeholder="Enter note (e.g., borrowed by John, damaged corner, moved to storage...)"
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                rows={3}
                style={{ resize: 'vertical', minHeight: '80px' }}
              />
              <button 
                className="btn-primary" 
                onClick={() => handleAddNote(showNotesModal.id)}
                style={{ marginTop: '12px' }}
                disabled={!newNote.trim()}
              >
                Add Note
              </button>
            </div>
            
            {/* Notes list */}
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {(!showNotesModal.notes || showNotesModal.notes.length === 0) ? (
                <div style={{
                  padding: '32px',
                  textAlign: 'center',
                  background: 'rgba(15, 23, 42, 0.5)',
                  borderRadius: '12px'
                }}>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
                    No notes yet. Add your first note above.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[...(showNotesModal.notes || [])].reverse().map(note => (
                    <div key={note.id} style={{
                      background: 'rgba(15, 23, 42, 0.5)',
                      borderRadius: '12px',
                      padding: '16px',
                      borderLeft: '3px solid #fbbf24'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '8px'
                      }}>
                        <span style={{ 
                          fontSize: '11px', 
                          color: '#64748b',
                          fontFamily: "'JetBrains Mono', monospace"
                        }}>
                          {formatNoteTimestamp(note.timestamp)}
                        </span>
                        <button
                          onClick={() => handleDeleteNote(showNotesModal.id, note.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#64748b',
                            cursor: 'pointer',
                            fontSize: '14px',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}
                          onMouseOver={e => e.target.style.color = '#ef4444'}
                          onMouseOut={e => e.target.style.color = '#64748b'}
                          title="Delete note"
                        >
                          ✕
                        </button>
                      </div>
                      <p style={{ 
                        margin: 0, 
                        fontSize: '14px', 
                        color: '#e2e8f0',
                        lineHeight: '1.5',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {note.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => { setShowNotesModal(null); setNewNote(''); }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Transfer Modal */}
      {showBulkTransfer && (
        <div className="modal-overlay" onClick={() => { setShowBulkTransfer(false); setBulkTransferTo(''); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '22px', fontWeight: '700' }}>
              📍 Bulk Transfer Assets
            </h2>
            <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#94a3b8' }}>
              Move {selectedAssets.length} selected asset{selectedAssets.length !== 1 ? 's' : ''} to a new location
            </p>
            
            {/* Selected assets list */}
            <div style={{ 
              marginBottom: '20px',
              maxHeight: '150px',
              overflowY: 'auto',
              background: 'rgba(15, 23, 42, 0.5)',
              borderRadius: '10px',
              padding: '12px'
            }}>
              {assets.filter(a => selectedAssets.includes(a.id)).map(asset => (
                <div key={asset.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                  fontSize: '14px'
                }}>
                  <span>{asset.name}</span>
                  <span className="location-badge" style={{ fontSize: '11px' }}>
                    {getLocationName(asset.locationId)}
                  </span>
                </div>
              ))}
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#94a3b8', fontWeight: '500' }}>
                New Location *
              </label>
              <select
                className="input-field"
                value={bulkTransferTo}
                onChange={e => setBulkTransferTo(e.target.value)}
              >
                <option value="">Select destination location</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
            
            <p style={{ margin: '16px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              💡 A note will be automatically added to each asset recording this transfer.
            </p>
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => { setShowBulkTransfer(false); setBulkTransferTo(''); }}>
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={handleBulkTransfer}
                disabled={!bulkTransferTo}
              >
                Transfer {selectedAssets.length} Asset{selectedAssets.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDelete && (
        <div className="modal-overlay" onClick={() => setShowBulkDelete(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '22px', fontWeight: '700', color: '#ef4444' }}>
              🗑️ Delete {selectedAssets.length} Asset{selectedAssets.length !== 1 ? 's' : ''}?
            </h2>
            <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#94a3b8' }}>
              This action cannot be undone. The following assets will be permanently deleted:
            </p>
            
            {/* Selected assets list */}
            <div style={{ 
              marginBottom: '20px',
              maxHeight: '200px',
              overflowY: 'auto',
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '10px',
              padding: '12px',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}>
              {assets.filter(a => selectedAssets.includes(a.id)).map(asset => (
                <div key={asset.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                  fontSize: '14px'
                }}>
                  <div>
                    <span style={{ fontWeight: '500' }}>{asset.name}</span>
                    <span style={{ color: '#64748b', marginLeft: '8px', fontSize: '12px' }}>
                      ({asset.quantity} unit{asset.quantity !== 1 ? 's' : ''})
                    </span>
                  </div>
                  <span style={{ 
                    fontFamily: "'JetBrains Mono', monospace",
                    color: '#ef4444',
                    fontSize: '13px'
                  }}>
                    {formatCurrency(asset.currentValue * asset.quantity)}
                  </span>
                </div>
              ))}
            </div>
            
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '10px',
              padding: '12px 16px',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#f87171' }}>
                ⚠️ Total value being deleted: <strong style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {formatCurrency(assets.filter(a => selectedAssets.includes(a.id)).reduce((sum, a) => sum + (a.currentValue * a.quantity), 0))}
                </strong>
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setShowBulkDelete(false)}>
                Cancel
              </button>
              <button 
                className="btn-danger" 
                onClick={handleBulkDelete}
              >
                Delete {selectedAssets.length} Asset{selectedAssets.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetManager;
