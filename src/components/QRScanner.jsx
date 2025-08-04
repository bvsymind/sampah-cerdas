import { useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader } from '@zxing/library';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Camera, X } from 'lucide-react';

export const QRScanner = ({ isOpen, onClose, onScan }) => {
  const videoRef = useRef(null);
  const [codeReader, setCodeReader] = useState(null);
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      startScanning();
    } else {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
  }, [isOpen]);

  const startScanning = async () => {
    try {
      setError('');
      setIsScanning(true);

      // Initialize QR code reader
      const reader = new BrowserQRCodeReader();
      setCodeReader(reader);

      // Get available video devices
      const videoInputDevices = await reader.listVideoInputDevices();
      
      if (videoInputDevices.length === 0) {
        throw new Error('Tidak ada kamera yang tersedia');
      }

      // Use back camera if available, otherwise use first camera
      const selectedDeviceId = videoInputDevices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear')
      )?.deviceId || videoInputDevices[0].deviceId;

      // Start decoding from video input
      await reader.decodeFromVideoDevice(
        selectedDeviceId,
        videoRef.current,
        (result, error) => {
          if (result) {
            const scannedData = result.getText();
            onScan(scannedData);
            stopScanning();
            onClose();
          }
          if (error && error.name !== 'NotFoundException') {
            console.warn('QR Scan error:', error);
          }
        }
      );
    } catch (err) {
      console.error('Scanner error:', err);
      setError(err.message || 'Gagal mengakses kamera');
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (codeReader) {
      codeReader.reset();
      setCodeReader(null);
    }
    setIsScanning(false);
  };

  const handleClose = () => {
    stopScanning();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scan QR Code Nasabah
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {error ? (
            <div className="text-center py-8">
              <div className="text-destructive text-sm mb-4">{error}</div>
              <Button onClick={startScanning} variant="outline">
                Coba Lagi
              </Button>
            </div>
          ) : (
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full h-64 bg-black rounded-lg object-cover"
                autoPlay
                muted
                playsInline
              />
              {isScanning && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 border-2 border-primary rounded-lg relative">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary"></div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="text-center text-sm text-muted-foreground">
            Arahkan kamera ke QR code nasabah untuk memindai
          </div>
          
          <Button variant="outline" onClick={handleClose} className="w-full">
            <X className="h-4 w-4 mr-2" />
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};