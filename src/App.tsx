import React, { useState, useEffect, useCallback } from 'react';
import { AppView, BestRecords, ReflexMode } from './types';
import { getStoredRecords, INITIAL_RECORDS } from './utils/storage';
import { MainMenu } from './components/MainMenu';
import { VisualMode } from './components/modes/VisualMode';
import { AudioMode } from './components/modes/AudioMode';
import { MemoryMode } from './components/modes/MemoryMode';
import { ColorMemoryMode } from './components/modes/ColorMemoryMode';
import { MotorMode } from './components/modes/MotorMode';
import { ConcentrationMode } from './components/modes/ConcentrationMode';
import { DigitSpanMode } from './components/modes/DigitSpanMode';
import { NBackMode } from './components/modes/NBackMode';
import { MatrixMode } from './components/modes/MatrixMode';
import { VisualTrackingMode } from './components/modes/VisualTrackingMode';
import { ChromaticAnomalyMode } from './components/modes/ChromaticAnomalyMode';
import { SwitchingMode } from './components/modes/SwitchingMode';
import { TemporalMode } from './components/modes/TemporalMode';
import { FlankerMode } from './components/modes/FlankerMode';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('menu');
  const [records, setRecords] = useState<BestRecords>(INITIAL_RECORDS);

  // Initialize and reload storage data
  const reloadData = useCallback(() => {
    try {
      const storedRecs = getStoredRecords();
      setRecords(storedRecs);
    } catch {
      // Defensive fallback
    }
  }, []);

  useEffect(() => {
    reloadData();
  }, [reloadData]);

  const handleSelectMode = (mode: ReflexMode) => {
    setCurrentView(mode);
  };

  const handleBackToMenu = () => {
    reloadData();
    setCurrentView('menu');
  };

  return (
    <div className="min-h-full min-h-[100dvh] w-full flex flex-col bg-slate-50 text-slate-900 selection:bg-rose-500 selection:text-white antialiased">
      {/* Dynamic View Router */}
      {currentView === 'menu' && (
        <MainMenu
          records={records}
          onSelectMode={handleSelectMode}
          onUpdateRecords={reloadData}
        />
      )}

      {currentView === 'visual' && (
        <VisualMode
          bestRecord={records.visual}
          onRecordUpdated={reloadData}
          onBackToMenu={handleBackToMenu}
        />
      )}

      {currentView === 'audio' && (
        <AudioMode
          bestRecord={records.audio}
          onRecordUpdated={reloadData}
          onBackToMenu={handleBackToMenu}
        />
      )}

      {currentView === 'memory' && (
        <MemoryMode
          bestRecord={records.memory}
          onRecordUpdated={reloadData}
          onBackToMenu={handleBackToMenu}
        />
      )}

      {currentView === 'color_memory' && (
        <ColorMemoryMode
          bestRecord={records.color_memory}
          onRecordUpdated={reloadData}
          onBackToMenu={handleBackToMenu}
        />
      )}

      {currentView === 'motor' && (
        <MotorMode
          bestRecord={records.motor}
          onRecordUpdated={reloadData}
          onBackToMenu={handleBackToMenu}
        />
      )}

      {currentView === 'concentration' && (
        <ConcentrationMode
          bestRecord={records.concentration}
          onRecordUpdated={reloadData}
          onBackToMenu={handleBackToMenu}
        />
      )}

      {currentView === 'digit_span' && (
        <DigitSpanMode
          bestRecord={records.digit_span}
          onRecordUpdated={reloadData}
          onBackToMenu={handleBackToMenu}
        />
      )}

      {currentView === 'nback' && (
        <NBackMode
          bestRecord={records.nback}
          onRecordUpdated={reloadData}
          onBackToMenu={handleBackToMenu}
        />
      )}

      {currentView === 'matrix' && (
        <MatrixMode
          records={records}
          onRecordUpdated={reloadData}
          onBackToMenu={handleBackToMenu}
        />
      )}

      {currentView === 'tracking' && (
        <VisualTrackingMode
          bestRecord={records.tracking}
          onRecordUpdated={reloadData}
          onBackToMenu={handleBackToMenu}
        />
      )}

      {currentView === 'chromatic' && (
        <ChromaticAnomalyMode
          bestRecord={records.chromatic}
          onRecordUpdated={reloadData}
          onBackToMenu={handleBackToMenu}
        />
      )}

      {currentView === 'switching' && (
        <SwitchingMode
          bestRecord={records.switching}
          onRecordUpdated={reloadData}
          onBackToMenu={handleBackToMenu}
        />
      )}

      {currentView === 'temporal' && (
        <TemporalMode
          bestRecord={records.temporal}
          onRecordUpdated={reloadData}
          onBackToMenu={handleBackToMenu}
        />
      )}

      {currentView === 'flanker' && (
        <FlankerMode
          bestRecord={records.flanker}
          onRecordUpdated={reloadData}
          onBackToMenu={handleBackToMenu}
        />
      )}
    </div>
  );
}
