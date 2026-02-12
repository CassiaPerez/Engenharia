
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Material, StockMovement, StockLocation, User, Project, OS } from '../types';
import * as XLSX from 'xlsx';
import { supabase, mapToSupabase } from '../services/supabase';
import ModalPortal from './ModalPortal';

interface Props {
  materials: Material[];
  movements: StockMovement[];
  setMaterials: React.Dispatch<React.SetStateAction<Material[]>>;
  onAddMovement: (mov: StockMovement) => void;
  currentUser: User;
  projects?: Project[];
}

const Inventory: React.FC<Props> = ({ materials, movements, setMaterials, onAddMovement, currentUser, projects = [] }) => {
  const [view, setView] = useState<'stock' | 'history'>('stock');
  const [allOS, setAllOS] = useState<OS[]>([]);

  const addMovementWithSync = async (mov: StockMovement) => {
    addMovementWithSync(mov);
    try {
      const { error } = await supabase.from('stock_movements').insert(mapToSupabase(mov));
      if (error) throw error;
    } catch (e) {
      console.error('Erro ao salvar movimento:', e);
    }
  };
  
  const [searchInput, setSearchInput] = useState(''); 
  const [searchTerm, setSearchTerm] = useState('');   
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [showModal, setShowModal] = useState(false);
  const [newMaterial, setNewMaterial] = useState<Partial<Material>>({
    status: 'ACTIVE',
    minStock: 10,
    currentStock: 0,
    unitCost: 0,
    group: 'Geral',
    unit: 'Un',
    code: ''
  });

  const [selectedMaterialForLoc, setSelectedMaterialForLoc] = useState<Material | null>(null);
  const [locAction, setLocAction] = useState<'IN' | 'OUT' | 'TRANSFER' | 'ADD' | 'VIEW'>('VIEW');
  const [locForm, setLocForm] = useState({
      location: '',
      toLocation: '',
      quantity: '',
      reason: '',
      osNumber: ''
  });

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchInput]);

  useEffect(() => {
    loadOS();
  }, []);

  const loadOS = async () => {
    try {
      const { data, error } = await supabase.from('os').select('*');
      if (error) throw error;
      if (data) {
        const osList = data.map(item => item.json_content);
        setAllOS(osList);
      }
    } catch (e) {
      console.error('Erro ao carregar OS:', e);
    }
  };

  const globalLocations = useMemo(() => {
    const locs = new Set<string>();
    materials.forEach(m => {
        if (m.location) locs.add(m.location);
        m.stockLocations?.forEach(l => locs.add(l.name));
    });
    // Locais Padrão
    locs.add('CD - Central');
    locs.add('Almoxarifado CropBio');
    locs.add('Almoxarifado CropFert');
    return Array.from(locs).sort();
  }, [materials]);

  const generateUniqueSKU = () => {
      const prefix = 'MAT';
      const year = new Date().getFullYear().toString().substr(-2);
      let unique = false;
      let code = '';
      let attempts = 0;

      while (!unique && attempts < 1000) {
          const random = Math.floor(1000 + Math.random() * 9000); 
          code = `${prefix}-${year}-${random}`;
          
          const exists = materials.some(m => m.code === code);
          if (!exists) {
              unique = true;
          }
          attempts++;
      }
      
      return code;
  };

  const openNewItemModal = () => {
      let defaultGroup = 'Geral';
      let defaultLoc = 'CD - Central';

      // Preenchimento inteligente baseado no perfil
      if (currentUser.role === 'WAREHOUSE_BIO') {
          defaultGroup = 'CropBio';
          defaultLoc = 'Almoxarifado CropBio';
      } else if (currentUser.role === 'WAREHOUSE_FERT') {
          defaultGroup = 'CropFert';
          defaultLoc = 'Almoxarifado CropFert';
      }

      setNewMaterial({
        status: 'ACTIVE',
        minStock: 10,
        currentStock: 0,
        unitCost: 0,
        group: defaultGroup,
        unit: 'Un',
        description: '', 
        location: defaultLoc, 
        code: generateUniqueSKU()
      });
      setShowModal(true);
  };

  const openLocationManager = (m: Material) => {
      if (!m.stockLocations || m.stockLocations.length === 0) {
          const defaultLocs = [{ name: m.location || 'CD - Central', quantity: m.currentStock }];
          const updatedM = { ...m, stockLocations: defaultLocs };
          setSelectedMaterialForLoc(updatedM);
      } else {
          setSelectedMaterialForLoc(m);
      }
      setLocAction('VIEW');
      setLocForm({ location: '', toLocation: '', quantity: '', reason: '', projectId: '', osNumber: '' });
  };

  const handleLocationSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedMaterialForLoc) return;

      const qty = Number(locForm.quantity);

      if (locAction !== 'ADD' && (isNaN(qty) || qty <= 0)) {
          alert('Quantidade inválida.');
          return;
      }

      let updatedMaterial: Material | null = null;

      setMaterials(prev => prev.map(m => {
          if (m.id === selectedMaterialForLoc.id) {
              let newLocations = m.stockLocations ? [...m.stockLocations] : [{ name: m.location || 'CD - Central', quantity: m.currentStock }];

              if (locAction === 'ADD') {
                  if (!locForm.location) return m;
                  if (newLocations.some(l => l.name === locForm.location)) {
                      alert('Este local já existe para este material.');
                      return m;
                  }

                  const initialQty = qty || 0;
                  newLocations.push({ name: locForm.location, quantity: initialQty });

                  if (initialQty > 0) {
                      addMovementWithSync({
                          id: Math.random().toString(36).substr(2, 9),
                          type: 'IN',
                          materialId: m.id,
                          quantity: initialQty,
                          date: new Date().toISOString(),
                          userId: currentUser.id,
                          description: locForm.reason || 'Cadastro de Local com Saldo',
                          toLocation: locForm.location
                      });
                  }

              } else if (locAction === 'IN') {
                  const targetLocIndex = newLocations.findIndex(l => l.name === locForm.location);
                  if (targetLocIndex >= 0) {
                      newLocations[targetLocIndex].quantity += qty;
                  } else {
                      newLocations.push({ name: locForm.location, quantity: qty });
                  }

                  addMovementWithSync({
                      id: Math.random().toString(36).substr(2, 9),
                      type: 'IN',
                      materialId: m.id,
                      quantity: qty,
                      date: new Date().toISOString(),
                      userId: currentUser.id,
                      description: locForm.reason || 'Entrada Manual',
                      toLocation: locForm.location
                  });

              } else if (locAction === 'OUT') {
                  const targetLocIndex = newLocations.findIndex(l => l.name === locForm.location);
                  if (targetLocIndex >= 0 && newLocations[targetLocIndex].quantity >= qty) {
                      newLocations[targetLocIndex].quantity -= qty;
                  } else {
                      alert('Saldo insuficiente no local selecionado.');
                      return m;
                  }

                   let desc = locForm.reason || 'Baixa Manual';
                   let costCenter: string | undefined;
                   let projectId: string | undefined;

                   if (locForm.osNumber) {
                       const selectedOS = allOS.find(os => os.number === locForm.osNumber);
                       if (selectedOS) {
                           if (selectedOS.projectId) {
                               const project = projects.find(p => p.id === selectedOS.projectId);
                               desc = `Baixa p/ Projeto: ${project?.code || 'N/A'} / OS: ${locForm.osNumber}`;
                               costCenter = project?.costCenter;
                               projectId = selectedOS.projectId;
                           } else if (selectedOS.buildingId) {
                               const building = projects.find(p => p.id === selectedOS.buildingId);
                               desc = `Baixa p/ Edifício: ${building?.code || 'N/A'} / OS: ${locForm.osNumber}`;
                               costCenter = selectedOS.costCenter;
                           } else if (selectedOS.equipmentId) {
                               desc = `Baixa p/ Equipamento / OS: ${locForm.osNumber}`;
                               costCenter = selectedOS.costCenter;
                           }
                       }
                   }

                   addMovementWithSync({
                      id: Math.random().toString(36).substr(2, 9),
                      type: 'OUT',
                      materialId: m.id,
                      quantity: qty,
                      date: new Date().toISOString(),
                      userId: currentUser.id,
                      description: desc,
                      fromLocation: locForm.location,
                      projectId: projectId,
                      osId: locForm.osNumber || undefined,
                      costCenter: costCenter
                  });

              } else if (locAction === 'TRANSFER') {
                  const fromIndex = newLocations.findIndex(l => l.name === locForm.location);
                  if (fromIndex >= 0 && newLocations[fromIndex].quantity >= qty) {
                      newLocations[fromIndex].quantity -= qty;

                      const toIndex = newLocations.findIndex(l => l.name === locForm.toLocation);
                      if (toIndex >= 0) {
                          newLocations[toIndex].quantity += qty;
                      } else {
                          newLocations.push({ name: locForm.toLocation, quantity: qty });
                      }

                       addMovementWithSync({
                          id: Math.random().toString(36).substr(2, 9),
                          type: 'TRANSFER',
                          materialId: m.id,
                          quantity: qty,
                          date: new Date().toISOString(),
                          userId: currentUser.id,
                          description: locForm.reason || 'Transferência entre Locais',
                          fromLocation: locForm.location,
                          toLocation: locForm.toLocation
                      });

                  } else {
                      alert('Saldo insuficiente na origem.');
                      return m;
                  }
              }

              const newTotal = newLocations.reduce((acc, l) => acc + l.quantity, 0);

              const updatedM = { ...m, currentStock: newTotal, stockLocations: newLocations };
              setSelectedMaterialForLoc(updatedM);
              updatedMaterial = updatedM;

              return updatedM;
          }
          return m;
      }));

      if (updatedMaterial) {
          try {
              const { error } = await supabase.from('materials').upsert({
                  id: updatedMaterial.id,
                  json_content: updatedMaterial
              });
              if (error) throw error;
          } catch (e) {
              console.error('Erro ao salvar alteração:', e);
          }
      }

      setLocForm({ location: '', toLocation: '', quantity: '', reason: '', osNumber: '' });
      setLocAction('VIEW');
  };

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaterial.code || !newMaterial.description) return;

    if (materials.some(m => m.code === newMaterial.code)) {
        alert('Erro: Este código SKU já existe. O sistema irá gerar um novo.');
        setNewMaterial({ ...newMaterial, code: generateUniqueSKU() });
        return;
    }

    const id = Math.random().toString(36).substr(2, 9);
    const initialQty = Number(newMaterial.currentStock) || 0;
    const initialLoc = newMaterial.location || 'CD - Central';

    const material: Material = {
        id,
        code: newMaterial.code,
        description: newMaterial.description,
        group: newMaterial.group || 'Geral',
        unit: newMaterial.unit || 'Un',
        unitCost: Number(newMaterial.unitCost) || 0,
        minStock: Number(newMaterial.minStock) || 0,
        currentStock: initialQty,
        location: initialLoc,
        stockLocations: [{ name: initialLoc, quantity: initialQty }],
        status: 'ACTIVE'
    };

    setMaterials(prev => [...prev, material]);

    try {
        const { error } = await supabase.from('materials').insert({
            id: material.id,
            json_content: material
        });
        if (error) throw error;
    } catch (e) {
        console.error('Erro ao salvar material:', e);
        alert('Erro ao salvar no banco de dados.');
    }

    if (material.currentStock > 0) {
        addMovementWithSync({
            id: Math.random().toString(36).substr(2, 9),
            type: 'IN',
            materialId: id,
            quantity: material.currentStock,
            date: new Date().toISOString(),
            userId: currentUser.id,
            description: 'Saldo Inicial (Cadastro Manual)',
            toLocation: initialLoc
        });
    }

    setShowModal(false);
    setNewMaterial({ status: 'ACTIVE', minStock: 10, currentStock: 0, unitCost: 0, group: 'Geral', unit: 'Un' });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      const importedMaterials: Material[] = [];
      let generatedCount = 0;
      
      data.forEach((row: any) => {
        let code = row['Codigo'] || row['SKU'] || row['Code'];
        const desc = row['Descricao'] || row['Description'];
        
        if (desc) {
            if (!code) {
                code = generateUniqueSKU(); 
                while (importedMaterials.some(im => im.code === code) || materials.some(m => m.code === code)) {
                     const random = Math.floor(1000 + Math.random() * 9000);
                     const year = new Date().getFullYear().toString().substr(-2);
                     code = `MAT-${year}-${random}`;
                }
                generatedCount++;
            }

            if (materials.some(m => m.code === code)) return;
            
            const qty = Number(row['Estoque']) || 0;
            const loc = row['Local'] || 'CD - Central';

            const newMat: Material = {
                id: Math.random().toString(36).substr(2, 9),
                code: String(code),
                description: String(desc),
                group: row['Grupo'] || 'Geral',
                unit: row['Unidade'] || 'Un',
                unitCost: Number(row['Custo']) || 0,
                minStock: Number(row['Minimo']) || 10,
                currentStock: qty,
                location: loc,
                stockLocations: [{ name: loc, quantity: qty }],
                status: 'ACTIVE'
            };
            importedMaterials.push(newMat);

            if (newMat.currentStock > 0) {
                addMovementWithSync({
                    id: Math.random().toString(36).substr(2, 9),
                    type: 'IN',
                    materialId: newMat.id,
                    quantity: newMat.currentStock,
                    date: new Date().toISOString(),
                    userId: currentUser.id,
                    description: 'Importação via Planilha',
                    toLocation: loc
                });
            }
        }
      });

      if (importedMaterials.length > 0) {
          setMaterials(prev => [...prev, ...importedMaterials]);
          alert(`${importedMaterials.length} itens importados com sucesso! (${generatedCount} códigos gerados automaticamente)`);
      } else {
          alert('Nenhum item novo encontrado ou formato inválido. Use colunas: Codigo, Descricao, Grupo, Unidade, Custo, Estoque');
      }
      
      if(fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
      const templateData = [
          {
              Codigo: 'EX-001',
              Descricao: 'Exemplo Material A',
              Grupo: 'Manutenção',
              Unidade: 'Un',
              Custo: 10.50,
              Estoque: 100,
              Minimo: 10,
              Local: 'CD - Central'
          },
          {
              Codigo: '', 
              Descricao: 'Exemplo Material B (Gerar Codigo)',
              Grupo: 'Elétrica',
              Unidade: 'M',
              Custo: 5.25,
              Estoque: 200,
              Minimo: 50,
              Local: 'CD - Central'
          }
      ];

      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Modelo Importacao");
      
      const wscols = [{wch: 15}, {wch: 30}, {wch: 15}, {wch: 10}, {wch: 10}, {wch: 10}, {wch: 10}, {wch: 15}];
      ws['!cols'] = wscols;

      XLSX.writeFile(wb, "Modelo_Importacao_Estoque.xlsx");
  };

  // --- FILTRAGEM INTELIGENTE POR PERFIL ---
  const filteredMaterials = useMemo(() => {
      // 1. Filtro de Texto
      const textFiltered = materials.filter(m => 
        m.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
        m.code.toLowerCase().includes(searchTerm.toLowerCase())
      );

      // 2. Filtro de Perfil (Bio vs Fert)
      if (currentUser.role === 'WAREHOUSE_BIO') {
          return textFiltered.filter(m => 
              (m.group && m.group.toLowerCase().includes('bio')) || 
              (m.location && m.location.toLowerCase().includes('bio'))
          );
      }
      if (currentUser.role === 'WAREHOUSE_FERT') {
          return textFiltered.filter(m => 
              (m.group && m.group.toLowerCase().includes('fert')) || 
              (m.location && m.location.toLowerCase().includes('fert'))
          );
      }

      // Admin e Warehouse Geral veem tudo
      return textFiltered;
  }, [materials, searchTerm, currentUser.role]);

  const filteredMovements = useMemo(() => {
      const sorted = movements.sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime());
      
      if (currentUser.role === 'WAREHOUSE_BIO') {
          // Filtrar movimentos de itens Bio
          return sorted.filter(mov => {
              const mat = materials.find(m => m.id === mov.materialId);
              return mat && (
                  (mat.group && mat.group.toLowerCase().includes('bio')) ||
                  (mat.location && mat.location.toLowerCase().includes('bio'))
              );
          });
      }
      if (currentUser.role === 'WAREHOUSE_FERT') {
          // Filtrar movimentos de itens Fert
          return sorted.filter(mov => {
              const mat = materials.find(m => m.id === mov.materialId);
              return mat && (
                  (mat.group && mat.group.toLowerCase().includes('fert')) ||
                  (mat.location && mat.location.toLowerCase().includes('fert'))
              );
          });
      }
      return sorted;
  }, [movements, materials, currentUser.role]);

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Almoxarifado Central</h2>
          <div className="flex items-center gap-2">
            <p className="text-slate-500 text-lg mt-1 font-medium">Controle físico de estoque e auditoria.</p>
            {currentUser.role === 'WAREHOUSE_BIO' && <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded border border-emerald-200 uppercase">Unidade Bio</span>}
            {currentUser.role === 'WAREHOUSE_FERT' && <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded border border-blue-200 uppercase">Unidade Fert</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
            <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                <button onClick={() => setView('stock')} className={`px-6 py-3 rounded-lg text-sm font-bold uppercase transition-all ${view === 'stock' ? 'bg-white text-slate-800 shadow-md transform scale-105' : 'text-slate-500 hover:text-slate-700'}`}>Saldo Atual</button>
                <button onClick={() => setView('history')} className={`px-6 py-3 rounded-lg text-sm font-bold uppercase transition-all ${view === 'history' ? 'bg-white text-slate-800 shadow-md transform scale-105' : 'text-slate-500 hover:text-slate-700'}`}>Kardex</button>
            </div>
            
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".xlsx, .xls, .csv" />
            
            <div className="flex bg-white rounded-xl border border-emerald-100 shadow-sm p-1">
                <button onClick={downloadTemplate} className="px-4 py-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg text-sm font-bold transition-all flex items-center gap-2 border-r border-slate-100 mr-1" title="Baixar planilha modelo">
                    <i className="fas fa-download"></i> Modelo
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-all flex items-center gap-2">
                    <i className="fas fa-file-excel"></i> Importar
                </button>
            </div>

            <button onClick={openNewItemModal} className="bg-clean-primary text-white px-6 py-3 rounded-xl font-bold text-sm uppercase hover:bg-clean-primary/90 shadow-lg shadow-clean-primary/20 flex items-center gap-2 transition-all h-[52px]">
                <i className="fas fa-plus"></i> Novo Item
            </button>
        </div>
      </header>

      {view === 'stock' ? (
        <>
          <div className="relative max-w-lg group">
            <i className={`fas ${searchInput !== searchTerm ? 'fa-spinner fa-spin text-clean-primary' : 'fa-search text-slate-400'} absolute left-4 top-1/2 -translate-y-1/2 text-lg transition-colors`}></i>
            <input 
                type="text" 
                placeholder="Filtrar materiais por nome ou código..." 
                className="w-full pl-12 pr-4 h-14 bg-white border border-slate-300 rounded-xl text-lg text-slate-800 shadow-sm focus:ring-2 focus:ring-clean-primary/20 focus:border-clean-primary placeholder:text-slate-400 font-medium transition-all" 
                value={searchInput} 
                onChange={e => setSearchInput(e.target.value)} 
            />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
             <table className="w-full text-base text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-xs tracking-wider">
                   <tr>
                      <th className="px-8 py-5">Código</th>
                      <th className="px-8 py-5">Descrição</th>
                      <th className="px-8 py-5">Grupo</th>
                      <th className="px-8 py-5 text-right">Mínimo</th>
                      <th className="px-8 py-5 text-right">Saldo Total</th>
                      <th className="px-8 py-5 text-center">Locais</th>
                      <th className="px-8 py-5 text-right">Valor Unit.</th>
                      <th className="px-8 py-5 text-center">Status</th>
                      <th className="px-8 py-5 text-center">Ações</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {filteredMaterials.map(m => {
                       const locCount = m.stockLocations ? m.stockLocations.length : 1;
                       return (
                           <tr key={m.id} className="hover:bg-slate-50 transition-colors group">
                               <td className="px-8 py-5 font-mono text-base text-slate-500 font-bold">{m.code}</td>
                               <td className="px-8 py-5 font-bold text-slate-800">{m.description}</td>
                               <td className="px-8 py-5 text-slate-500 font-medium">{m.group}</td>
                               <td className="px-8 py-5 text-right text-slate-400 font-medium">{m.minStock}</td>
                               <td className="px-8 py-5 text-right font-black text-slate-800 text-xl">
                                   {m.currentStock} 
                                   <span className="text-xs text-slate-400 font-bold uppercase ml-1">{m.unit}</span>
                               </td>
                               <td className="px-8 py-5 text-center">
                                    <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-md text-xs font-bold border border-slate-200">
                                        {locCount} Local(is)
                                    </span>
                               </td>
                               <td className="px-8 py-5 text-right font-medium text-slate-600">R$ {formatCurrency(m.unitCost)}</td>
                               <td className="px-8 py-5 text-center">
                                   {m.currentStock <= m.minStock ? (
                                       <span className="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide border border-red-200">Repor</span>
                                   ) : (
                                       <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide border border-emerald-200">OK</span>
                                   )}
                               </td>
                               <td className="px-8 py-5 text-center">
                                   <div className="flex items-center justify-center gap-2">
                                       <button onClick={() => openLocationManager(m)} className="bg-white border border-slate-300 text-slate-600 hover:text-clean-primary hover:border-clean-primary font-bold text-xs px-3 py-2 rounded-lg transition-all shadow-sm flex items-center gap-2">
                                           <i className="fas fa-boxes-stacked"></i> Gerenciar
                                       </button>
                                   </div>
                               </td>
                           </tr>
                       );
                   })}
                   {filteredMaterials.length === 0 && (
                       <tr>
                           <td colSpan={9} className="px-8 py-12 text-center text-slate-400 italic">
                               Nenhum material encontrado para o seu perfil de acesso.
                           </td>
                       </tr>
                   )}
                </tbody>
             </table>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
           <h3 className="font-bold text-xl text-slate-800 mb-6 flex items-center gap-2"><i className="fas fa-history text-clean-primary"></i> Histórico de Movimentação (Kardex)</h3>
           <div className="overflow-x-auto">
               <table className="w-full text-base text-left">
                   <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs tracking-wider"><tr className="border-b border-slate-200"><th className="p-5">Data</th><th className="p-5">Tipo</th><th className="p-5">Material</th><th className="p-5 text-right">Qtd</th><th className="p-5">Locais (Origem &rarr; Destino)</th><th className="p-5">Responsável</th><th className="p-5">Justificativa / Centro de Custo</th></tr></thead>
                   <tbody className="divide-y divide-slate-100">
                       {filteredMovements.map(mov => (
                           <tr key={mov.id} className="hover:bg-slate-50">
                               <td className="p-5 text-slate-500 font-mono font-medium">{new Date(mov.date).toLocaleString()}</td>
                               <td className="p-5"><span className={`font-black text-xs px-3 py-1.5 rounded-lg border uppercase tracking-wide ${mov.type==='IN'?'bg-emerald-50 text-emerald-700 border-emerald-200':mov.type==='OUT'?'bg-amber-50 text-amber-700 border-amber-200':mov.type==='TRANSFER'?'bg-purple-50 text-purple-700 border-purple-200':'bg-blue-50 text-blue-700 border-blue-200'}`}>{mov.type}</span></td>
                               <td className="p-5 font-bold text-slate-700">{materials.find(m=>m.id===mov.materialId)?.description || '---'}</td>
                               <td className="p-5 text-right font-mono font-bold text-lg">{mov.quantity}</td>
                               <td className="p-5 text-sm text-slate-600">
                                   {mov.type === 'TRANSFER' ? (
                                       <span className="flex items-center gap-2">
                                           <span className="bg-slate-100 px-2 py-0.5 rounded text-xs border border-slate-200">{mov.fromLocation}</span>
                                           <i className="fas fa-arrow-right text-slate-400"></i>
                                           <span className="bg-slate-100 px-2 py-0.5 rounded text-xs border border-slate-200">{mov.toLocation}</span>
                                       </span>
                                   ) : (
                                       <span>{mov.toLocation || mov.fromLocation || '-'}</span>
                                   )}
                               </td>
                               <td className="p-5 text-slate-700 font-medium">{mov.userId}</td>
                               <td className="p-5 text-slate-500 font-medium">
                                   {mov.description}
                                   <div className="flex gap-2 mt-1">
                                       {mov.projectId && (
                                           <span className="text-[10px] font-bold text-slate-400 bg-slate-100 rounded px-1.5 py-0.5 w-fit">
                                               Proj: {projects.find(p => p.id === mov.projectId)?.code || '---'}
                                           </span>
                                       )}
                                       {mov.costCenter && (
                                           <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 rounded px-1.5 py-0.5 w-fit border border-emerald-200">
                                               CC: {mov.costCenter}
                                           </span>
                                       )}
                                   </div>
                               </td>
                           </tr>
                       ))}
                   </tbody>
               </table>
           </div>
        </div>
      )}

      {/* MODAL DE CRIAÇÃO (Premium Style) */}
      {showModal && (
        <ModalPortal>
            <div className="fixed inset-0 z-[9999]">
              <div className="absolute inset-0 bg-slate-900/75 backdrop-blur-md transition-opacity" onClick={() => setShowModal(false)} />
              <div className="absolute inset-0 overflow-y-auto p-4 flex justify-center items-start">
                <div className="relative w-full max-w-2xl my-8 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
                    <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                        <div>
                            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Novo Item de Estoque</h3>
                            <p className="text-sm text-slate-500 mt-1">Cadastro de material no almoxarifado.</p>
                        </div>
                        <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-500 transition-colors border border-transparent hover:border-slate-200"><i className="fas fa-times text-lg"></i></button>
                    </div>
                    <div className="flex-1 overflow-y-auto bg-slate-50/50 min-h-0">
                        <form onSubmit={handleCreateMaterial} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-sm font-bold text-slate-700 mb-2 block">Código (SKU) <span className="text-xs font-normal text-emerald-600 ml-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100"><i className="fas fa-lock text-[10px]"></i> Sistema</span></label>
                                    <div className="relative">
                                        <input 
                                            readOnly
                                            className="w-full h-12 px-4 bg-slate-100 border border-slate-200 rounded-xl text-base text-slate-500 font-bold shadow-sm focus:outline-none cursor-not-allowed uppercase" 
                                            value={newMaterial.code} 
                                            title="Gerado automaticamente pelo sistema"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-slate-700 mb-2 block">Grupo / Categoria</label>
                                    <input required className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-base text-slate-900 font-medium shadow-sm focus:border-clean-primary focus:ring-4 focus:ring-clean-primary/10 transition-all" placeholder="Ex: Elétrica" value={newMaterial.group} onChange={e => setNewMaterial({...newMaterial, group: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-bold text-slate-700 mb-2 block">Descrição Completa</label>
                                <input required className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-base text-slate-900 font-medium shadow-sm focus:border-clean-primary focus:ring-4 focus:ring-clean-primary/10 transition-all" placeholder="Ex: Cabo Flexível 2.5mm Preto" value={newMaterial.description} onChange={e => setNewMaterial({...newMaterial, description: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-3 gap-6">
                                <div>
                                    <label className="text-sm font-bold text-slate-700 mb-2 block">Unidade</label>
                                    <input required className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-base text-slate-900 font-medium shadow-sm focus:border-clean-primary focus:ring-4 focus:ring-clean-primary/10 transition-all" placeholder="Un, Kg, M" value={newMaterial.unit} onChange={e => setNewMaterial({...newMaterial, unit: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-slate-700 mb-2 block">Custo Unit. (R$)</label>
                                    <input type="number" step="0.01" min="0" required className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-base text-slate-900 font-medium shadow-sm focus:border-clean-primary focus:ring-4 focus:ring-clean-primary/10 transition-all" value={newMaterial.unitCost} onChange={e => setNewMaterial({...newMaterial, unitCost: Number(e.target.value)})} />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-slate-700 mb-2 block">Local Padrão</label>
                                    <input className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-base text-slate-900 font-medium shadow-sm focus:border-clean-primary focus:ring-4 focus:ring-clean-primary/10 transition-all" placeholder="CD - Central" value={newMaterial.location} onChange={e => setNewMaterial({...newMaterial, location: e.target.value})} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-6 p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                                <div>
                                    <label className="text-sm font-bold text-slate-700 mb-2 block">Estoque Mínimo</label>
                                    <input type="number" min="0" required className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-base text-slate-900 font-medium shadow-sm focus:border-clean-primary focus:ring-4 focus:ring-clean-primary/10 transition-all" value={newMaterial.minStock} onChange={e => setNewMaterial({...newMaterial, minStock: Number(e.target.value)})} />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-slate-700 mb-2 block">Estoque Inicial</label>
                                    <input type="number" min="0" required className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-base text-slate-900 font-medium shadow-sm focus:border-clean-primary focus:ring-4 focus:ring-clean-primary/10 transition-all" value={newMaterial.currentStock} onChange={e => setNewMaterial({...newMaterial, currentStock: Number(e.target.value)})} />
                                    <p className="text-xs text-slate-400 mt-1.5 ml-1">Será adicionado ao Local Padrão.</p>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div className="px-8 py-5 bg-white border-t border-slate-100 flex justify-end gap-4 rounded-b-2xl shrink-0">
                        <button type="button" onClick={() => setShowModal(false)} className="px-8 py-3.5 text-base font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all">Cancelar</button>
                        <button type="submit" onClick={handleCreateMaterial} className="px-10 py-3.5 text-base font-bold text-white bg-clean-primary hover:bg-clean-primary/90 rounded-xl shadow-xl shadow-clean-primary/30 transition-all transform hover:-translate-y-1 active:scale-95 flex items-center gap-2">
                            <i className="fas fa-check"></i> Cadastrar Material
                        </button>
                    </div>
                </div>
              </div>
            </div>
        </ModalPortal>
      )}

      {/* MODAL DE GESTÃO DE LOCAIS (Premium Style) */}
      {selectedMaterialForLoc && (
          <ModalPortal>
            <div className="fixed inset-0 z-[9999]">
              <div className="absolute inset-0 bg-slate-900/75 backdrop-blur-md transition-opacity" onClick={() => setSelectedMaterialForLoc(null)} />
              <div className="absolute inset-0 overflow-y-auto p-4 flex justify-center items-start">
                <div className="relative w-full max-w-3xl my-8 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
                    <div className="px-8 py-6 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
                        <div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Gestão de Armazenagem</p>
                            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{selectedMaterialForLoc.description}</h3>
                        </div>
                        <button onClick={() => setSelectedMaterialForLoc(null)} className="w-10 h-10 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-500 transition-colors border border-transparent hover:border-slate-200"><i className="fas fa-times text-lg"></i></button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar min-h-0">
                        {/* Resumo de Estoque */}
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 flex flex-col justify-center">
                                <span className="block text-xs font-bold text-emerald-600 uppercase tracking-wide">Saldo Total</span>
                                <span className="text-4xl font-black text-emerald-800 mt-1">{selectedMaterialForLoc.currentStock} <span className="text-sm font-bold text-emerald-600 align-middle">{selectedMaterialForLoc.unit}</span></span>
                            </div>
                            <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 flex flex-col justify-center">
                                    <span className="block text-xs font-bold text-blue-600 uppercase tracking-wide">Locais Ativos</span>
                                    <span className="text-4xl font-black text-blue-800 mt-1">{selectedMaterialForLoc.stockLocations?.filter(l => l.quantity > 0).length || 0}</span>
                            </div>
                        </div>

                        {/* Lista de Locais */}
                        <h4 className="font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2 flex items-center gap-2"><i className="fas fa-map-marker-alt text-clean-primary"></i> Distribuição Física</h4>
                        <div className="space-y-3 mb-8">
                            {selectedMaterialForLoc.stockLocations?.map((loc, idx) => (
                                <div key={idx} className="flex justify-between items-center p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400"><i className="fas fa-warehouse"></i></div>
                                        <span className="font-bold text-slate-700 text-lg">{loc.name}</span>
                                    </div>
                                    <span className="font-mono font-bold text-xl text-slate-900 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">{loc.quantity} <span className="text-xs text-slate-400 font-sans">{selectedMaterialForLoc.unit}</span></span>
                                </div>
                            ))}
                            {(!selectedMaterialForLoc.stockLocations || selectedMaterialForLoc.stockLocations.length === 0) && (
                                <p className="text-center text-slate-400 italic py-6 bg-slate-50 rounded-xl border border-slate-100 border-dashed">Nenhum local registrado.</p>
                            )}
                        </div>

                        {/* Ações */}
                        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                            <div className="flex flex-wrap bg-white p-1 rounded-xl border border-slate-200 mb-6 shadow-sm">
                                <button onClick={() => { setLocAction('ADD'); setLocForm({...locForm, location: '', toLocation: '', quantity: '', osNumber: ''}); }} className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${locAction === 'ADD' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>+ Local</button>
                                <button onClick={() => { setLocAction('TRANSFER'); setLocForm({...locForm, location: '', toLocation: '', quantity: '', osNumber: ''}); }} className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${locAction === 'TRANSFER' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>Transferir</button>
                                <button onClick={() => { setLocAction('IN'); setLocForm({...locForm, location: '', toLocation: '', quantity: '', osNumber: ''}); }} className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${locAction === 'IN' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>Entrada</button>
                                <button onClick={() => { setLocAction('OUT'); setLocForm({...locForm, location: '', toLocation: '', quantity: '', osNumber: ''}); }} className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${locAction === 'OUT' ? 'bg-red-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>Baixa p/ OS</button>
                            </div>

                            {locAction !== 'VIEW' && (
                                <form onSubmit={handleLocationSubmit} className="space-y-5 animate-in fade-in slide-in-from-top-2">
                                    {locAction === 'ADD' ? (
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Nome do Novo Local</label>
                                            <input required list="all-locations-list" className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white shadow-sm focus:border-slate-400 focus:ring-0 transition-all" placeholder="Ex: Prateleira B-02" value={locForm.location} onChange={e => setLocForm({...locForm, location: e.target.value})} />
                                            <p className="text-[10px] text-slate-400 mt-1.5 ml-1">O local ficará disponível na lista global.</p>
                                        </div>
                                    ) : locAction === 'TRANSFER' ? (
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Origem (Onde está)</label>
                                                <select required className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white shadow-sm focus:border-slate-400 focus:ring-0 transition-all" value={locForm.location} onChange={e => setLocForm({...locForm, location: e.target.value})}>
                                                    <option value="">Selecione...</option>
                                                    {selectedMaterialForLoc.stockLocations?.map((l, i) => <option key={i} value={l.name}>{l.name} ({l.quantity})</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Destino (Para onde vai)</label>
                                                <input required list="all-locations-list" className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white shadow-sm focus:border-slate-400 focus:ring-0 transition-all" placeholder="Selecionar ou Digitar..." value={locForm.toLocation} onChange={e => setLocForm({...locForm, toLocation: e.target.value})} />
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Local Alvo</label>
                                            {locAction === 'OUT' ? (
                                                <select required className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white shadow-sm focus:border-slate-400 focus:ring-0 transition-all" value={locForm.location} onChange={e => setLocForm({...locForm, location: e.target.value})}>
                                                    <option value="">Selecione...</option>
                                                    {selectedMaterialForLoc.stockLocations?.map((l, i) => <option key={i} value={l.name}>{l.name} ({l.quantity})</option>)}
                                                </select>
                                            ) : (
                                                <>
                                                    <input required list="all-locations-list" className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white shadow-sm focus:border-slate-400 focus:ring-0 transition-all" placeholder="Selecionar ou Digitar..." value={locForm.location} onChange={e => setLocForm({...locForm, location: e.target.value})} />
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {/* SELEÇÃO DE OS PARA BAIXA */}
                                    {locAction === 'OUT' && (
                                        <div className="bg-red-50 p-4 rounded-xl border border-red-100 space-y-4">
                                            <div>
                                                <label className="text-xs font-bold text-red-700 uppercase block mb-2">
                                                    Ordem de Serviço <span className="text-red-600">*</span>
                                                    {allOS.filter(os => os.status !== 'COMPLETED' && os.status !== 'CANCELED').length > 0 && (
                                                        <span className="ml-2 text-[10px] bg-red-100 px-2 py-0.5 rounded border border-red-200">
                                                            {allOS.filter(os => os.status !== 'COMPLETED' && os.status !== 'CANCELED').length} OS disponíveis
                                                        </span>
                                                    )}
                                                </label>
                                                <select
                                                    required
                                                    className="w-full h-12 px-4 rounded-xl border border-red-200 bg-white shadow-sm focus:border-red-400 focus:ring-0 transition-all text-slate-800"
                                                    value={locForm.osNumber}
                                                    onChange={e => setLocForm({...locForm, osNumber: e.target.value})}
                                                >
                                                    <option value="">Selecione a OS de destino...</option>
                                                    {allOS
                                                        .filter(os => os.status !== 'COMPLETED' && os.status !== 'CANCELED')
                                                        .map(os => {
                                                            let context = '';
                                                            if (os.projectId) {
                                                                const proj = projects.find(p => p.id === os.projectId);
                                                                context = proj ? ` | Projeto: ${proj.code}` : ' | Projeto';
                                                            } else if (os.buildingId) {
                                                                context = ' | Edifício';
                                                            } else if (os.equipmentId) {
                                                                context = ' | Equipamento';
                                                            }
                                                            return (
                                                                <option key={os.id} value={os.number}>
                                                                    {os.number} - {os.description}{context} ({os.status})
                                                                </option>
                                                            );
                                                        })
                                                    }
                                                </select>
                                            </div>
                                            <p className="text-[10px] text-red-600">A baixa será vinculada à OS selecionada e o custo alocado ao centro de custo correspondente.</p>
                                            {(() => {
                                                if (locForm.osNumber) {
                                                    const selectedOS = allOS.find(os => os.number === locForm.osNumber);
                                                    if (selectedOS) {
                                                        let displayCostCenter = '';
                                                        let osContext = '';

                                                        if (selectedOS.projectId) {
                                                            const project = projects.find(p => p.id === selectedOS.projectId);
                                                            displayCostCenter = project?.costCenter || 'N/A';
                                                            osContext = `Projeto: ${project?.code || 'N/A'}`;
                                                        } else if (selectedOS.buildingId) {
                                                            displayCostCenter = selectedOS.costCenter || 'N/A';
                                                            osContext = 'Vinculada a Edifício';
                                                        } else if (selectedOS.equipmentId) {
                                                            displayCostCenter = selectedOS.costCenter || 'N/A';
                                                            osContext = 'Vinculada a Equipamento';
                                                        }

                                                        return (
                                                            <div className="mt-3 p-3 bg-white rounded-lg border border-red-200 space-y-2">
                                                                <div>
                                                                    <p className="text-[10px] font-bold text-red-800 uppercase mb-1">Contexto da OS</p>
                                                                    <p className="text-sm font-bold text-red-900">{osContext}</p>
                                                                </div>
                                                                {displayCostCenter && (
                                                                    <div>
                                                                        <p className="text-[10px] font-bold text-red-800 uppercase mb-1">Centro de Custo</p>
                                                                        <p className="text-sm font-bold text-red-900">{displayCostCenter}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    }
                                                }
                                                return null;
                                            })()}
                                        </div>
                                    )}

                                    {/* Datalist Global para Autocomplete de Criação/Reuso */}
                                    <datalist id="all-locations-list">
                                        {globalLocations.map((loc, i) => <option key={i} value={loc} />)}
                                    </datalist>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase block mb-2">{locAction === 'ADD' ? 'Saldo Inicial (Opcional)' : 'Quantidade'}</label>
                                            <input type="number" min="0" step="1" required={locAction !== 'ADD'} className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white shadow-sm focus:border-slate-400 focus:ring-0 transition-all font-bold text-slate-800" value={locForm.quantity} onChange={e => setLocForm({...locForm, quantity: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Justificativa</label>
                                            {locAction === 'OUT' && locForm.osNumber ? (
                                                <input disabled className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-100 shadow-sm text-slate-400 italic cursor-not-allowed" value="Baixa vinculada à OS (Automático)" />
                                            ) : (
                                                <input className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white shadow-sm focus:border-slate-400 focus:ring-0 transition-all" value={locForm.reason} onChange={e => setLocForm({...locForm, reason: e.target.value})} placeholder="Motivo da operação..." />
                                            )}
                                        </div>
                                    </div>

                                    <button type="submit" className="w-full py-4 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-all shadow-lg hover:shadow-xl transform active:scale-[0.98]">Confirmar Operação</button>
                                </form>
                            )}
                            {locAction === 'VIEW' && <p className="text-center text-sm text-slate-400 py-4 font-medium">Selecione uma ação acima para movimentar o estoque.</p>}
                        </div>
                    </div>
                </div>
              </div>
            </div>
          </ModalPortal>
      )}
    </div>
  );
};

export default Inventory;
