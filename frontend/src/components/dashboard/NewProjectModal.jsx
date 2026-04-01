import React, { useState, useRef } from 'react';
import LoadingSpinner from '../common/LoadingSpinner.jsx';

export default function NewProjectModal({ onClose, onSubmit, onImport, isLoading }) {
  const [mode, setMode] = useState('create'); // 'create' | 'import'

  // Create form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState('');

  // Import state
  const [importData, setImportData] = useState(null);
  const [importFileName, setImportFileName] = useState('');
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError('Le nom du projet est requis.');
      return;
    }
    setNameError('');
    onSubmit(name.trim(), description.trim());
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportFileName(file.name);
    setImportError('');
    setImportData(null);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        if (!data.name || typeof data.name !== 'string') {
          throw new Error('Le fichier ne contient pas de nom de projet valide.');
        }
        setImportData(data);
      } catch (err) {
        setImportError(`Fichier invalide : ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!importData || isLoading) return;
    onImport(importData);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 id="modal-title" className="text-white font-semibold text-lg">
            {mode === 'create' ? 'Nouveau projet' : 'Importer un projet'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl leading-none"
            aria-label="Fermer"
          >
            &times;
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-gray-900 rounded-lg p-1">
          <button
            onClick={() => setMode('create')}
            className={`flex-1 text-sm py-1.5 rounded-md transition-colors ${
              mode === 'create' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Créer
          </button>
          <button
            onClick={() => setMode('import')}
            className={`flex-1 text-sm py-1.5 rounded-md transition-colors ${
              mode === 'import' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Importer
          </button>
        </div>

        {/* Create form */}
        {mode === 'create' && (
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-4">
              <label htmlFor="project-name" className="block text-gray-300 text-sm mb-1.5">
                Nom du projet <span className="text-red-400">*</span>
              </label>
              <input
                id="project-name"
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); if (nameError) setNameError(''); }}
                placeholder="Mon super projet"
                className={`w-full bg-gray-700 border text-gray-200 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-500 ${
                  nameError ? 'border-red-500' : 'border-gray-600'
                }`}
                autoFocus
              />
              {nameError && <p className="text-red-400 text-xs mt-1">{nameError}</p>}
            </div>

            <div className="mb-6">
              <label htmlFor="project-description" className="block text-gray-300 text-sm mb-1.5">
                Description <span className="text-gray-500">(optionnel)</span>
              </label>
              <textarea
                id="project-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brève description du projet..."
                rows={3}
                className="w-full bg-gray-700 border border-gray-600 text-gray-200 text-sm rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-500"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button type="button" onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-gray-200 text-sm transition-colors">
                Annuler
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className={`flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition-colors ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isLoading && <LoadingSpinner size="sm" />}
                Créer le projet
              </button>
            </div>
          </form>
        )}

        {/* Import form */}
        {mode === 'import' && (
          <div>
            <p className="text-gray-400 text-sm mb-4">
              Sélectionne un fichier de backup JSON exporté depuis cette application.
            </p>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full mb-4 flex flex-col items-center justify-center gap-2 px-4 py-6 border-2 border-dashed border-gray-600 hover:border-indigo-500 rounded-lg text-gray-400 hover:text-indigo-400 transition-colors"
            >
              <span className="text-2xl">↑</span>
              <span className="text-sm">
                {importFileName ? importFileName : 'Cliquer pour sélectionner un fichier JSON'}
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />

            {importError && <p className="text-red-400 text-xs mb-4">{importError}</p>}

            {importData && (
              <div className="mb-4 px-3 py-2 bg-gray-900 rounded-lg border border-gray-700">
                <p className="text-gray-300 text-sm font-medium">{importData.name}</p>
                {importData.description && (
                  <p className="text-gray-500 text-xs mt-0.5">{importData.description}</p>
                )}
                <p className="text-gray-600 text-xs mt-1">
                  {importData.tree?.nodes?.length ?? 0} nœuds &middot;{' '}
                  {importData.answers?.length ?? 0} réponses &middot;{' '}
                  {importData.pendingQuestions?.length ?? 0} questions en attente
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button type="button" onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-gray-200 text-sm transition-colors">
                Annuler
              </button>
              <button
                onClick={handleImport}
                disabled={!importData || isLoading}
                className={`flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition-colors ${
                  !importData || isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isLoading && <LoadingSpinner size="sm" />}
                Importer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
