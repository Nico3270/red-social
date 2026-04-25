"use client";

import { useState, useEffect } from 'react';
import { FaSearch } from 'react-icons/fa';
import {  List, ListItem, ListItemButton, ListItemIcon, ListItemText,  CircularProgress } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { titleFont } from '@/config/fonts';
import { getCloudinaryImageUrl } from '@/lib/cloudinary/buildCloudinaryDeliveryUrl';

interface SearchResult {
  id: string;
  name: string;
  type: 'negocio' | 'usuario' | 'producto' | 'servicio' | 'category';
  slug: string;
  thumbnail?: string;
  tab?: string;
}

interface SearchBarProps {
  compact?: boolean;
}

const SearchBar = ({ compact = false }: SearchBarProps) => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
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

  const handleClick = (result: SearchResult) => {
    let url = '';
    if (result.type === 'negocio' || result.type === 'usuario') {
      url = `/perfil/${result.slug}`;
    } else if (result.type === 'producto') {
      url = `/producto/${result.slug}`;
    } else if (result.type === 'servicio') {
      url = `/perfil/${result.slug}?tab=${result.tab || 'Negocio'}`;
    } else if (result.type === 'category') {
      url = `/category/${result.slug}`;
    }
    router.push(url);
    setSearchTerm('');
    setResults([]);
  };

  return (
    <div className="relative flex-1">
      <div
        className={`flex items-center rounded-full border border-gray-300 bg-white shadow-md ${
          compact ? "px-3 py-1.5" : "px-4 py-2"
        }`}
      >
        <FaSearch className="text-gray-500" />
        <input
          type="text"
          placeholder="Buscar productos, negocios o categorías"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`ml-3 w-full bg-transparent font-medium text-gray-800 outline-none ${
            compact ? "text-sm" : ""
          }`}
        />
      </div>
      <AnimatePresence>
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute w-full md:w-[400px] mt-2 bg-white rounded-lg shadow-xl border border-gray-200 max-h-80 overflow-y-auto z-50"
          >
            <List sx={{ p: 2 }}>
              {results.map((result) => {
                const resultThumbnailUrl = result.thumbnail;
                const optimizedResultThumbnailUrl = resultThumbnailUrl
                  ? getCloudinaryImageUrl(resultThumbnailUrl, 'thumbnail')
                  : '';

                return (
                  <ListItem disablePadding key={result.id}>
                    <ListItemButton
                      onClick={() => handleClick(result)}
                      sx={{
                        py: 1.5,
                        '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)', scale: 1.02 },
                        transition: 'background-color 0.2s, scale 0.2s',
                      }}
                    >
                      {resultThumbnailUrl && (
                        <ListItemIcon sx={{ minWidth: '48px' }}>
                          <Image
                            src={optimizedResultThumbnailUrl}
                            alt={result.name ? `Imagen de ${result.name}` : 'Resultado de búsqueda'}
                            width={40}
                            height={40}
                            className="rounded-full object-cover"
                          />
                        </ListItemIcon>
                      )}
                      <ListItemText
                        primary={<span className={titleFont.className}>{result.name}</span>}
                        secondary={result.type.charAt(0).toUpperCase() + result.type.slice(1)}
                        primaryTypographyProps={{
                          fontWeight: 'medium',
                          color: result.type === 'negocio' ? 'primary.main' : result.type === 'producto' ? 'success.main' : result.type === 'servicio' ? 'info.main' : result.type === 'usuario' ? 'secondary.main' : 'warning.main',
                        }}
                        secondaryTypographyProps={{ color: 'text.secondary', fontSize: '0.75rem' }}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
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
