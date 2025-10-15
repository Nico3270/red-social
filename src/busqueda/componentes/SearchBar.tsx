"use client";

import { useState, useEffect } from 'react';
import { FaSearch } from 'react-icons/fa';
import { Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography, CircularProgress } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const SearchBar = () => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [debouncedTerm, setDebouncedTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (debouncedTerm) {
      setIsLoading(true);
      fetch(`/api/search?query=${encodeURIComponent(debouncedTerm)}&limit=10`)
        .then(res => res.json())
        .then(data => {
          setResults(data);
          setIsLoading(false);
        })
        .catch(() => {
          setResults([]);
          setIsLoading(false);
        });
    } else {
      setResults([]);
    }
  }, [debouncedTerm]);

  const handleClick = (result: any) => {
    let url = '';
    if (result.type === 'negocio' || result.type === 'usuario') {
      url = `/perfil/${result.slug}`;
    } else if (result.type === 'producto') {
      url = `/producto/${result.slug}`;
    } else if (result.type === 'servicio') {
      url = `/perfil/${result.slug}?tab=Negocio`;
    } else if (result.type === 'category') {
      url = `/categorias/${result.slug}`;
    }
    router.push(url);
    setSearchTerm('');
    setResults([]);
  };

  return (
    <div className="relative flex-1">
      <div className="flex items-center bg-white rounded-full shadow-md border border-gray-300 px-4 py-2">
        <FaSearch className="text-gray-500" />
        <input
          type="text"
          placeholder="Buscar productos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent outline-none ml-3 text-gray-800"
        />
      </div>
      <AnimatePresence>
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute w-full mt-2 bg-white rounded-lg shadow-xl border border-gray-200 max-h-80 overflow-y-auto z-50"
          >
            <List>
              {results.map((result) => (
                <ListItem disablePadding key={result.id}>
                  <ListItemButton onClick={() => handleClick(result)}>
                    {result.thumbnail && (
  <ListItemIcon>
    <Image
      src={result.thumbnail}
      alt={result.name ? `Imagen de ${result.name}` : 'Resultado de búsqueda'}
      width={40}
      height={40}
      className="rounded-full object-cover"
    />
  </ListItemIcon>
)}

                    <ListItemText
                      primary={result.name}
                      secondary={result.type}
                      primaryTypographyProps={{ fontWeight: 'medium', color: 'text.primary' }}
                      secondaryTypographyProps={{ color: 'text.secondary' }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </motion.div>
        )}
      </AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute w-full mt-2 flex justify-center"
        >
          <CircularProgress size={24} />
        </motion.div>
      )}
    </div>
  );
};

export default SearchBar;