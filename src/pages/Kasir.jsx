import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { QRScanner } from '../components/QRScanner';
import { toast } from 'sonner';
import { 
  Search, 
  QrCode, 
  Package, 
  Trash2, 
  Plus, 
  ShoppingCart,
  Calculator,
  CheckCircle
} from 'lucide-react';

export const Kasir = () => {
  const [idNasabah, setIdNasabah] = useState('');
  const [nasabah, setNasabah] = useState(null);
  const [jenisSampah, setJenisSampah] = useState([]);
  const [transaksiItems, setTransaksiItems] = useState([]);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [selectedSampah, setSelectedSampah] = useState(null);
  const [beratInput, setBeratInput] = useState('');
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadJenisSampah();
  }, []);

  const loadJenisSampah = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'jenis_sampah'));
      const sampahData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setJenisSampah(sampahData);
    } catch (error) {
      console.error('Error loading jenis sampah:', error);
      toast.error('Gagal memuat data jenis sampah');
    }
  };

  const cekNasabah = async () => {
    if (!idNasabah.trim()) {
      toast.error('Masukkan ID Nasabah');
      return;
    }

    try {
      const nasabahDoc = await getDoc(doc(db, 'nasabah', idNasabah));
      if (nasabahDoc.exists()) {
        setNasabah(nasabahDoc.data());
        toast.success(`Nasabah ditemukan: ${nasabahDoc.data().nama}`);
      } else {
        setNasabah(null);
        toast.error('ID tidak terdaftar');
      }
    } catch (error) {
      console.error('Error checking nasabah:', error);
      toast.error('Gagal memeriksa data nasabah');
    }
  };

  const handleQRScan = (scannedData) => {
    setIdNasabah(scannedData);
    // Auto check nasabah after QR scan
    setTimeout(() => {
      cekNasabah();
    }, 100);
  };

  const handleSampahClick = (sampah) => {
    setSelectedSampah(sampah);
    setBeratInput('');
    setIsInputModalOpen(true);
  };

  const calculateSubtotal = () => {
    const berat = parseFloat(beratInput) || 0;
    const harga = selectedSampah?.harga_kg || 0;
    return berat * harga;
  };

  const tambahKeTransaksi = () => {
    const berat = parseFloat(beratInput);
    
    if (!berat || berat <= 0) {
      toast.error('Masukkan berat yang valid');
      return;
    }

    const item = {
      id: Date.now(),
      nama_sampah: selectedSampah.nama,
      berat_kg: berat,
      harga_kg: selectedSampah.harga_kg,
      subtotal: calculateSubtotal()
    };

    setTransaksiItems([...transaksiItems, item]);
    setIsInputModalOpen(false);
    setBeratInput('');
    setSelectedSampah(null);
    toast.success('Item ditambahkan ke transaksi');
  };

  const hapusItem = (itemId) => {
    setTransaksiItems(transaksiItems.filter(item => item.id !== itemId));
    toast.success('Item dihapus dari transaksi');
  };

  const getTotalHarga = () => {
    return transaksiItems.reduce((total, item) => total + item.subtotal, 0);
  };

  const simpanTransaksi = async () => {
    if (!nasabah) {
      toast.error('Pilih nasabah terlebih dahulu');
      return;
    }

    if (transaksiItems.length === 0) {
      toast.error('Tambahkan minimal satu item');
      return;
    }

    setIsLoading(true);

    try {
      const totalHarga = getTotalHarga();
      const totalBerat = transaksiItems.reduce((total, item) => total + item.berat_kg, 0);

      // Simpan transaksi
      await addDoc(collection(db, 'transaksi'), {
        id_nasabah: idNasabah,
        nama_nasabah: nasabah.nama,
        timestamp: new Date(),
        tipe: 'setor',
        total_harga: totalHarga,
        total_berat_kg: totalBerat,
        items: transaksiItems.map(item => ({
          nama_sampah: item.nama_sampah,
          berat_kg: item.berat_kg,
          harga_kg: item.harga_kg,
          subtotal: item.subtotal
        }))
      });

      // Update saldo nasabah
      await updateDoc(doc(db, 'nasabah', idNasabah), {
        saldo: increment(totalHarga)
      });

      toast.success(`Transaksi berhasil disimpan! Total: Rp ${totalHarga.toLocaleString('id-ID')}`);
      
      // Reset form
      setIdNasabah('');
      setNasabah(null);
      setTransaksiItems([]);
      setIsConfirmModalOpen(false);
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast.error('Gagal menyimpan transaksi');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-primary">Pencatatan Setoran</h1>
      </div>

      {/* Input Nasabah */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Data Nasabah
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="idNasabah">ID Nasabah</Label>
              <Input
                id="idNasabah"
                type="number"
                placeholder="Masukkan ID Nasabah"
                value={idNasabah}
                onChange={(e) => setIdNasabah(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={() => setIsQRScannerOpen(true)} variant="outline">
                <QrCode className="h-4 w-4" />
                Scan QR
              </Button>
              <Button onClick={cekNasabah}>
                Cek Nasabah
              </Button>
            </div>
          </div>

          {nasabah && (
            <div className="bg-accent/10 p-4 rounded-lg">
              <div className="text-sm text-muted-foreground">Nama Nasabah:</div>
              <div className="font-medium text-lg">{nasabah.nama}</div>
              <div className="text-sm text-muted-foreground mt-1">
                Saldo Saat Ini: Rp {nasabah.saldo?.toLocaleString('id-ID') || 0}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grid Jenis Sampah */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Pilih Jenis Sampah
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {jenisSampah.map((sampah) => (
              <Card 
                key={sampah.id} 
                className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary/20"
                onClick={() => handleSampahClick(sampah)}
              >
                <CardContent className="p-4 text-center">
                  {sampah.foto_url ? (
                    <img 
                      src={sampah.foto_url} 
                      alt={sampah.nama}
                      className="w-16 h-16 mx-auto mb-2 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-16 h-16 mx-auto mb-2 bg-muted rounded-lg flex items-center justify-center">
                      <Package className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="font-medium text-sm">{sampah.nama}</div>
                  <div className="text-xs text-muted-foreground">
                    Rp {sampah.harga_kg?.toLocaleString('id-ID')}/kg
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Ringkasan Transaksi */}
      {transaksiItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Ringkasan Transaksi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {transaksiItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{item.nama_sampah}</div>
                  <div className="text-sm text-muted-foreground">
                    {item.berat_kg} kg × Rp {item.harga_kg.toLocaleString('id-ID')}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="font-bold">Rp {item.subtotal.toLocaleString('id-ID')}</div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => hapusItem(item.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            <div className="border-t pt-4">
              <div className="flex items-center justify-between text-lg font-bold">
                <span>Total Harga:</span>
                <span className="text-primary">Rp {getTotalHarga().toLocaleString('id-ID')}</span>
              </div>
            </div>

            <Button 
              onClick={() => setIsConfirmModalOpen(true)}
              className="w-full"
              size="lg"
              disabled={!nasabah}
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              Simpan Transaksi
            </Button>
          </CardContent>
        </Card>
      )}

      {/* QR Scanner */}
      <QRScanner
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        onScan={handleQRScan}
      />

      {/* Input Berat Modal */}
      <Dialog open={isInputModalOpen} onOpenChange={setIsInputModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Input Berat - {selectedSampah?.nama}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="berat">Berat (kg)</Label>
              <Input
                id="berat"
                type="number"
                step="0.1"
                placeholder="0.0"
                value={beratInput}
                onChange={(e) => setBeratInput(e.target.value)}
                className="mt-1"
              />
            </div>
            
            {beratInput && (
              <div className="bg-accent/10 p-3 rounded-lg">
                <div className="text-sm text-muted-foreground">Subtotal:</div>
                <div className="text-lg font-bold text-primary">
                  Rp {calculateSubtotal().toLocaleString('id-ID')}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInputModalOpen(false)}>
              Batal
            </Button>
            <Button onClick={tambahKeTransaksi}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi Simpan */}
      <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Transaksi</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Total Transaksi</div>
              <div className="text-2xl font-bold text-primary">
                Rp {getTotalHarga().toLocaleString('id-ID')}
              </div>
            </div>
            <div className="text-center text-sm text-muted-foreground">
              Anda yakin ingin menyimpan transaksi ini?
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmModalOpen(false)}>
              Batal
            </Button>
            <Button onClick={simpanTransaksi} disabled={isLoading}>
              {isLoading ? 'Menyimpan...' : 'Ya, Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};