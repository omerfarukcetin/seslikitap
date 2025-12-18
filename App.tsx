
import React, { useState, useEffect, useMemo } from 'react';
import { Book, PlayerState, AppState, BookCategory, Topic } from './types';
import { MOCK_BOOKS } from './constants';
import Player from './components/Player';
import BookCard from './components/BookCard';
import {
  subscribeToBooks,
  db,
  doc,
  setDoc,
  deleteDoc,
  auth,
  signIn,
  signUp,
  logout,
  syncUserData,
  updateFavoritesInFirebase,
  updateProgressInFirebase,
  updatePlaybackSpeedInFirebase,
  updateUsernameInFirebase,
  createUserProfile,
  onAuthStateChanged
} from './firebase';

const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [appState, setAppState] = useState<AppState>({
    theme: 'dark',
    isLoggedIn: false,
    isAdmin: false,
    user: null
  });

  const [books, setBooks] = useState<Book[]>(MOCK_BOOKS);
  const [userData, setUserData] = useState<{
    username: string,
    favorites: string[],
    progress: Record<string, { topicIndex: number, percent: number }>,
    playbackSpeed: number
  }>({
    username: '',
    favorites: [],
    progress: {},
    playbackSpeed: 1
  });

  const [isAdminPanel, setIsAdminPanel] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const [editingBook, setEditingBook] = useState<Partial<Book> | null>(null);
  const [topicsJson, setTopicsJson] = useState<string>('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPanelPassword, setAdminPanelPassword] = useState('');

  const [playerState, setPlayerState] = useState<PlayerState>({
    currentBook: null,
    currentTopicIndex: 0,
    isPlaying: false,
    progress: 0,
    currentTime: '0:00',
    totalDuration: '0:00',
    playbackSpeed: 1
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        const isAdminAccount = user.email === 'admin@admin.com';
        setAppState(prev => ({
          ...prev,
          isLoggedIn: true,
          isAdmin: isAdminAccount,
          user: { name: user.email?.split('@')[0] || 'Kullanıcı', avatar: '', isPremium: true }
        }));
      } else {
        setCurrentUser(null);
        setAppState(prev => ({ ...prev, isLoggedIn: false, isAdmin: false, user: null }));
        setUserData({ username: '', favorites: [], progress: {}, playbackSpeed: 1 });
        setIsAdminAuthenticated(false);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (currentUser) {
      const unsub = syncUserData(currentUser.uid, (data) => {
        setUserData({
          username: data.username || currentUser.email.split('@')[0],
          favorites: data.favorites || [],
          progress: data.progress || {},
          playbackSpeed: data.playbackSpeed || 1
        });
        setNewUsername(data.username || '');
        setPlayerState(prev => ({ ...prev, playbackSpeed: data.playbackSpeed || 1 }));
      });
      return () => unsub();
    }
  }, [currentUser]);

  // Sayfa açılışında localStorage'dan cache'lenmiş kitapları yükle
  useEffect(() => {
    const cached = localStorage.getItem('cachedFirebaseBooks');
    if (cached) {
      try {
        const cachedBooks = JSON.parse(cached) as Book[];
        setBooks(prev => {
          const combined = [...MOCK_BOOKS];
          cachedBooks.forEach(fb => {
            const idx = combined.findIndex(c => c.id === fb.id);
            if (idx > -1) combined[idx] = fb;
            else combined.push(fb);
          });
          return combined;
        });
      } catch (e) {
        console.warn('Cache parse error:', e);
      }
    }
  }, []);

  useEffect(() => {
    const unsub = subscribeToBooks((firebaseBooks) => {
      // Firebase'den gelen kitapları validate et
      const validBooks = firebaseBooks.filter(fb => {
        // Minimum gerekli alanları kontrol et
        if (!fb || !fb.id || typeof fb.id !== 'string') {
          console.warn('Invalid book skipped: missing id', fb);
          return false;
        }
        if (!fb.title || typeof fb.title !== 'string') {
          console.warn('Invalid book skipped: missing title', fb);
          return false;
        }
        // topics varsa array olmalı
        if (fb.topics && !Array.isArray(fb.topics)) {
          console.warn('Invalid book skipped: topics is not an array', fb);
          return false;
        }
        return true;
      });

      const processedBooks: Book[] = [];

      validBooks.forEach(fb => {
        // Eksik alanları varsayılan değerlerle doldur
        const safeBook = {
          ...fb,
          author: fb.author || 'Bilinmeyen Yazar',
          category: fb.category || 'Din',
          description: fb.description || '',
          coverUrl: fb.coverUrl || 'https://via.placeholder.com/300x450',
          duration: fb.duration || '',
          rating: fb.rating || 0,
          reviewsCount: fb.reviewsCount || 0,
          topics: Array.isArray(fb.topics) ? fb.topics : []
        } as Book;
        processedBooks.push(safeBook);
      });

      // LocalStorage'a cache'le (hızlı yükleme için)
      try {
        localStorage.setItem('cachedFirebaseBooks', JSON.stringify(processedBooks));
      } catch (e) {
        console.warn('Cache save error:', e);
      }

      setBooks(prev => {
        const combined = [...MOCK_BOOKS];
        processedBooks.forEach(safeBook => {
          const idx = combined.findIndex(c => c.id === safeBook.id);
          if (idx > -1) combined[idx] = safeBook;
          else combined.push(safeBook);
        });
        return combined;
      });
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark', 'cream', 'green', 'blue');
    root.classList.add(appState.theme);
  }, [appState.theme]);

  const toggleTheme = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAppState(p => {
      let next: 'light' | 'dark' | 'cream' | 'green' | 'blue' = 'dark';
      if (p.theme === 'dark') next = 'light';
      else if (p.theme === 'light') next = 'blue';
      else if (p.theme === 'blue') next = 'cream';
      else if (p.theme === 'cream') next = 'green';
      return { ...p, theme: next };
    });
  };

  const handlePlayBook = (book: Book, topicIndex: number = 0) => {
    const saved = userData.progress[book.id];
    const index = (saved && book.id === selectedBook?.id) ? saved.topicIndex : topicIndex;
    const percent = (saved && book.id === selectedBook?.id) ? saved.percent : 0;

    setPlayerState({
      currentBook: book,
      currentTopicIndex: index,
      isPlaying: true,
      progress: percent,
      currentTime: '0:00',
      totalDuration: '0:00',
      playbackSpeed: userData.playbackSpeed
    });
  };

  const onProgressUpdate = (progress: number, currentSeconds: number, durationSeconds: number) => {
    setPlayerState(prev => ({
      ...prev,
      progress,
      currentTime: formatTime(currentSeconds),
      totalDuration: formatTime(durationSeconds)
    }));

    if (currentUser && playerState.currentBook && Math.floor(currentSeconds) % 10 === 0) {
      updateProgressInFirebase(currentUser.uid, playerState.currentBook.id, {
        topicIndex: playerState.currentTopicIndex,
        percent: progress
      });
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    try {
      if (isRegistering) {
        const cred = await signUp(authEmail, authPassword);
        await createUserProfile(cred.user.uid, authEmail);
      } else {
        await signIn(authEmail, authPassword);
      }
      setShowAuthModal(false);
      setAuthEmail('');
      setAuthPassword('');
    } catch (e: any) {
      alert("Hata: " + e.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newUsername.trim()) return;
    try {
      await updateUsernameInFirebase(currentUser.uid, newUsername.trim());
      setShowProfileModal(false);
    } catch (err: any) {
      alert('Hata: ' + err.message);
    }
  };

  const goHome = () => {
    setIsAdminPanel(false);
    setSelectedBook(null);
    setSearchQuery('');
  };

  const filteredBooks = useMemo(() => {
    const q = searchQuery.toLocaleLowerCase('tr-TR').trim();
    if (!q) return books;
    return books.filter(b =>
      b.title.toLocaleLowerCase('tr-TR').includes(q) ||
      (b.author || '').toLocaleLowerCase('tr-TR').includes(q) ||
      b.topics?.some(t => t.title.toLocaleLowerCase('tr-TR').includes(q))
    );
  }, [books, searchQuery]);

  const renderAdmin = () => {
    if (!isAdminAuthenticated) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-10 space-y-8 animate-fade-in">
          <div className="size-20 rounded-3xl bg-primary/20 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-4xl">admin_panel_settings</span>
          </div>
          <h2 className="text-2xl font-bold">Yönetici Girişi</h2>
          <div className="w-full max-w-xs space-y-4">
            <input
              type="password"
              className="glass-panel p-4 rounded-2xl w-full outline-none text-center"
              placeholder="Panel Şifresi"
              value={adminPanelPassword}
              onChange={e => setAdminPanelPassword(e.target.value)}
            />
            <button
              onClick={() => adminPanelPassword === 'Admin.2025' ? setIsAdminAuthenticated(true) : alert('Hatalı!')}
              className="w-full bg-primary text-white py-4 rounded-2xl font-bold transition-all"
            >
              Giriş
            </button>
            <button onClick={() => setIsAdminPanel(false)} className="w-full text-xs opacity-50">Geri Dön</button>
          </div>
        </div>
      );
    }
    return (
      <div className="p-6 md:p-10 space-y-6 max-w-6xl mx-auto animate-fade-in pb-40">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold">Kitap Yönetimi</h2>
          <div className="flex gap-2">
            <button onClick={() => { const newBook = { id: 'book-' + Date.now(), title: '', author: '', topics: [] }; setEditingBook(newBook); setTopicsJson('[]'); }} className="bg-primary text-white px-6 py-2 rounded-xl text-sm font-bold">+ Yeni</button>
            <button onClick={() => setIsAdminPanel(false)} className="glass-panel px-6 py-2 rounded-xl text-sm">Paneli Kapat</button>
          </div>
        </div>
        <div className="grid gap-3">
          {books.map(b => (
            <div key={b.id} className="glass-panel p-4 rounded-2xl flex justify-between items-center">
              <span className="font-bold truncate">{b.title}</span>
              <div className="flex gap-2">
                <button onClick={() => { setEditingBook(b); setTopicsJson(JSON.stringify(b.topics || [], null, 2)); }} className="p-2 text-primary"><span className="material-symbols-outlined">edit</span></button>
                <button onClick={() => { if (window.confirm('Silinsin mi?')) deleteDoc(doc(db, "books", b.id)) }} className="p-2 text-red-500"><span className="material-symbols-outlined">delete</span></button>
              </div>
            </div>
          ))}
        </div>
        {editingBook && (
          <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="glass-panel w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 md:p-10 rounded-[2.5rem] space-y-6 no-scrollbar">
              <div className="flex justify-between">
                <h3 className="text-xl font-bold">Düzenle: {editingBook.title}</h3>
                <button onClick={() => setEditingBook(null)}><span className="material-symbols-outlined">close</span></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input className="glass-panel p-3 rounded-xl outline-none" placeholder="ID" value={editingBook.id} onChange={e => setEditingBook({ ...editingBook, id: e.target.value })} />
                <input className="glass-panel p-3 rounded-xl outline-none" placeholder="Başlık" value={editingBook.title} onChange={e => setEditingBook({ ...editingBook, title: e.target.value })} />
                <input className="glass-panel p-3 rounded-xl outline-none" placeholder="Yazar" value={editingBook.author} onChange={e => setEditingBook({ ...editingBook, author: e.target.value })} />
                <input className="glass-panel p-3 rounded-xl outline-none" placeholder="Kapak URL" value={editingBook.coverUrl} onChange={e => setEditingBook({ ...editingBook, coverUrl: e.target.value })} />
                <input className="glass-panel p-3 rounded-xl outline-none" placeholder="Satın Alma URL (opsiyonel)" value={editingBook.buyUrl || ''} onChange={e => setEditingBook({ ...editingBook, buyUrl: e.target.value })} />
                <input className="glass-panel p-3 rounded-xl outline-none" placeholder="PDF Adresi (opsiyonel)" value={editingBook.pdfUrl || ''} onChange={e => setEditingBook({ ...editingBook, pdfUrl: e.target.value })} />
                <textarea className="glass-panel p-3 rounded-xl outline-none md:col-span-2 h-20" placeholder="Açıklama" value={editingBook.description} onChange={e => setEditingBook({ ...editingBook, description: e.target.value })} />
                <div className="md:col-span-2">
                  <label className="text-xs font-bold opacity-50 mb-1 block">Bölümler (JSON)</label>
                  <textarea
                    className="w-full glass-panel p-3 rounded-xl outline-none font-mono text-[10px] h-40"
                    value={topicsJson}
                    onChange={e => setTopicsJson(e.target.value)}
                    placeholder='[{"id": "topic-1", "title": "Bölüm 1", "audioUrl": "..."}]'
                  />
                </div>
              </div>
              <button onClick={async () => {
                try {
                  const parsedTopics = JSON.parse(topicsJson);
                  const bookToSave = { ...editingBook, topics: parsedTopics, createdAt: editingBook.createdAt || new Date().toISOString() };
                  await setDoc(doc(db, "books", editingBook.id!), bookToSave, { merge: true });
                  setEditingBook(null);
                  setTopicsJson('');
                } catch (err: any) {
                  alert('JSON formatı hatalı: ' + err.message);
                }
              }} className="w-full bg-primary text-white py-4 rounded-2xl font-bold">Veritabanına Kaydet</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderDetail = (book: Book) => {
    const isFav = userData.favorites.includes(book.id);
    return (
      <div className="px-4 md:px-10 py-6 w-full animate-fade-in space-y-8 pb-40">
        <button onClick={() => setSelectedBook(null)} className="flex items-center gap-2 opacity-50 hover:opacity-100 font-bold">
          <span className="material-symbols-outlined">arrow_back</span> Ana Sayfaya Dön
        </button>
        <div className="flex flex-col lg:flex-row gap-8 xl:gap-16 items-start">
          <div className="w-48 md:w-64 lg:w-72 xl:w-80 shrink-0 mx-auto lg:mx-0">
            <img src={book.coverUrl} className="w-full aspect-[1/1.5] object-cover rounded-[2rem] shadow-2xl border border-white/5" alt={book.title} />
          </div>
          <div className="flex-1 space-y-10">
            <div className="space-y-4 text-center lg:text-left">
              <h1 className="text-3xl md:text-6xl font-black leading-tight">{book.title}</h1>
              <div className="flex items-center justify-center lg:justify-start gap-4">
                <span className="px-4 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold uppercase">{book.category}</span>
                <span className="font-bold opacity-60 md:text-xl">{book.author}</span>
              </div>
              <div className="flex flex-wrap justify-center lg:justify-start gap-4 pt-4">
                <button onClick={() => handlePlayBook(book)} className="px-8 py-4 bg-primary text-white rounded-full font-bold shadow-xl flex items-center gap-2 active:scale-95 transition-all">
                  <span className="material-symbols-outlined fill-1">play_arrow</span> Hemen Dinle
                </button>
                <a
                  href={book.buyUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => { if (!book.buyUrl) e.preventDefault(); }}
                  className={`px-6 py-4 rounded-full font-bold flex items-center gap-2 transition-all ${book.buyUrl ? 'bg-green-500 text-white shadow-xl active:scale-95' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                >
                  <span className="material-symbols-outlined">shopping_cart</span> Satın Al
                </a>
                <a
                  href={book.pdfUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => { if (!book.pdfUrl) e.preventDefault(); }}
                  className={`px-6 py-4 rounded-full font-bold flex items-center gap-2 transition-all ${book.pdfUrl ? 'bg-orange-500 text-white shadow-xl active:scale-95' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                >
                  <span className="material-symbols-outlined">menu_book</span> PDF Oku
                </a>
                <button onClick={() => {
                  if (!currentUser) { setShowAuthModal(true); return; }
                  const newFavs = isFav ? userData.favorites.filter(id => id !== book.id) : [...userData.favorites, book.id];
                  updateFavoritesInFirebase(currentUser.uid, newFavs);
                }} className={`size-14 rounded-full flex items-center justify-center border-2 transition-all ${isFav ? 'bg-red-500 border-red-500 text-white' : 'border-white/10'}`}>
                  <span className={`material-symbols-outlined ${isFav ? 'fill-1' : ''}`}>favorite</span>
                </button>
                {/* İlerlemeyi Sıfırla butonu */}
                {userData.progress[book.id] && (
                  <button
                    onClick={() => {
                      if (window.confirm('Bu kitaptaki ilerlemenizi sıfırlamak istediğinizden emin misiniz?')) {
                        if (!currentUser) return;
                        const newProgress = { ...userData.progress };
                        delete newProgress[book.id];
                        setUserData(prev => ({ ...prev, progress: newProgress }));
                        // Firebase'e kaydet
                        const userDocRef = doc(db, 'users', currentUser.uid);
                        setDoc(userDocRef, { progress: newProgress }, { merge: true });
                      }
                    }}
                    className="size-14 rounded-full flex items-center justify-center border-2 border-white/10 hover:border-red-500/50 hover:bg-red-500/10 transition-all text-slate-400 hover:text-red-500"
                    title="İlerlemeyi Sıfırla"
                  >
                    <span className="material-symbols-outlined">restart_alt</span>
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <div className="glass-panel p-8 rounded-[2.5rem] space-y-4">
                <h3 className="text-lg font-bold uppercase tracking-widest opacity-50 text-center lg:text-left">Kitap Hakkında</h3>
                <p className="leading-relaxed opacity-80 whitespace-pre-line text-sm md:text-base">{book.description || "Açıklama yok."}</p>
              </div>
              {book.topics && (
                <div className="glass-panel p-6 rounded-[2.5rem] max-h-[500px] overflow-y-auto no-scrollbar relative">
                  <div className="sticky top-0 z-20 py-4 mb-4 bg-slate-100/90 dark:bg-slate-900/95 backdrop-blur-xl border-b border-white/5 -mx-4 px-6 rounded-t-[2.5rem] flex justify-between items-center">
                    <h3 className="font-bold">Bölümler ({book.topics.length})</h3>
                    <span className="text-xs opacity-50">{book.duration}</span>
                  </div>
                  <div className="space-y-2">
                    {book.topics.map((t, i) => {
                      const active = playerState.currentBook?.id === book.id && playerState.currentTopicIndex === i;
                      return (
                        <div key={t.id} onClick={() => handlePlayBook(book, i)} className={`p-4 rounded-2xl cursor-pointer transition-all border flex justify-between items-center group ${active ? 'bg-primary text-white border-primary shadow-lg' : 'bg-white/5 border-transparent hover:bg-white/10'}`}>
                          <span className="truncate font-bold text-xs md:text-sm">{t.title}</span>
                          <span className="material-symbols-outlined shrink-0">{active && playerState.isPlaying ? 'pause' : 'play_circle'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-screen w-full overflow-hidden transition-colors duration-300 ${appState.theme}`}>
      <header className="h-20 md:h-28 flex items-center justify-between px-4 md:px-12 shrink-0 z-50">
        <div className="flex items-center gap-3 cursor-pointer select-none" onClick={goHome}>
          <div className="size-10 md:size-14 rounded-2xl bg-primary flex items-center justify-center text-white shadow-xl">
            <span className="material-symbols-outlined text-2xl md:text-3xl">graphic_eq</span>
          </div>
          <h1 className="text-xl md:text-3xl font-black tracking-tighter hidden sm:block">SesliKitap</h1>
        </div>

        <div className="flex-1 max-w-xl mx-6 md:mx-12 relative group">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:text-primary transition-colors">search</span>
          <input
            className="w-full pl-12 pr-6 py-3.5 rounded-full glass-panel border-none outline-none focus:ring-2 focus:ring-primary/40 transition-all text-sm md:text-base"
            placeholder="Kitap veya yazar ara..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setSelectedBook(null); setIsAdminPanel(false); }}
          />
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={toggleTheme}
            className="size-10 md:size-14 rounded-full glass-panel flex items-center justify-center hover:scale-105 active:scale-95 transition-all outline-none"
          >
            <span className="material-symbols-outlined pointer-events-none">
              {appState.theme === 'dark' ? 'light_mode' : (appState.theme === 'light' ? 'water_drop' : (appState.theme === 'blue' ? 'bakery_dining' : 'eco'))}
            </span>
          </button>

          {appState.isAdmin && (
            <button onClick={() => setIsAdminPanel(!isAdminPanel)} className={`size-10 md:size-14 rounded-full flex items-center justify-center transition-all ${isAdminPanel ? 'bg-primary text-white' : 'glass-panel text-primary'}`}>
              <span className="material-symbols-outlined">settings</span>
            </button>
          )}

          <button
            className="size-10 md:size-14 rounded-full glass-panel flex items-center justify-center border-2 border-primary/20 hover:scale-105 active:scale-95 transition-all outline-none"
            onClick={(e) => { e.stopPropagation(); appState.isLoggedIn ? setShowProfileModal(true) : setShowAuthModal(true); }}
          >
            <span className="material-symbols-outlined text-3xl pointer-events-none">account_circle</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar">
        {isAdminPanel ? renderAdmin() : selectedBook ? renderDetail(selectedBook) : (
          <div className="px-4 md:px-12 py-6 space-y-10 pb-52 max-w-[1800px] mx-auto animate-fade-in">
            <div className="flex items-baseline gap-4">
              <h2 className="text-2xl md:text-5xl font-black tracking-tight">{searchQuery ? 'Arama Sonuçları' : 'Tüm Kitaplar'}</h2>
              <span className="opacity-40 font-bold text-sm md:text-lg">({filteredBooks.length})</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-10">
              {filteredBooks.map(b => (
                <BookCard
                  key={b.id}
                  book={b}
                  onClick={setSelectedBook}
                  onPlay={() => handlePlayBook(b)}
                  onResume={() => {
                    const saved = userData.progress[b.id];
                    if (saved) {
                      handlePlayBook(b, saved.topicIndex);
                    } else {
                      handlePlayBook(b);
                    }
                  }}
                  isFavorite={userData.favorites.includes(b.id)}
                  onToggleFavorite={() => {
                    if (!currentUser) { setShowAuthModal(true); return; }
                    const newFavs = userData.favorites.includes(b.id) ? userData.favorites.filter(id => id !== b.id) : [...userData.favorites, b.id];
                    updateFavoritesInFirebase(currentUser.uid, newFavs);
                  }}
                  progress={userData.progress[b.id]}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {showAuthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel w-full max-w-md p-10 rounded-[3rem] space-y-8 animate-fade-in">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black">{isRegistering ? 'Kayıt Ol' : 'Giriş Yap'}</h2>
              <p className="text-xs opacity-50">Binlerce sayfa ses, tek tıkla kulağında.</p>
            </div>
            <form onSubmit={handleAuth} className="space-y-4">
              <input type="email" placeholder="E-posta" required className="w-full p-4 rounded-2xl glass-panel outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white" value={authEmail} onChange={e => setAuthEmail(e.target.value)} />
              <input type="password" placeholder="Şifre" required className="w-full p-4 rounded-2xl glass-panel outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white" value={authPassword} onChange={e => setAuthPassword(e.target.value)} />
              <button type="submit" disabled={isAuthLoading} className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-xl active:scale-95 transition-all">
                {isAuthLoading ? 'Yükleniyor...' : (isRegistering ? 'Kaydı Tamamla' : 'Giriş Yap')}
              </button>
            </form>
            <div className="flex flex-col gap-4 text-center">
              <button onClick={() => setIsRegistering(!isRegistering)} className="text-xs font-bold text-primary hover:underline">{isRegistering ? 'Zaten hesabım var' : 'Hesabın yok mu? Hemen katıl'}</button>
              <button onClick={() => setShowAuthModal(false)} className="text-[10px] opacity-40 hover:opacity-100 transition-opacity uppercase tracking-widest font-bold">Kapat / İptal</button>
            </div>
          </div>
        </div>
      )}

      {showProfileModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel w-full max-w-sm p-8 rounded-[2.5rem] space-y-6 animate-fade-in">
            <h3 className="text-xl font-bold">Hesap Ayarları</h3>
            <form onSubmit={handleUpdateUsername} className="space-y-4">
              <label className="text-[10px] font-bold opacity-40 uppercase ml-2">Görünen İsim</label>
              <input type="text" className="w-full p-4 rounded-2xl glass-panel outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white" value={newUsername} onChange={e => setNewUsername(e.target.value)} />
              <button type="submit" className="w-full py-4 bg-primary text-white rounded-2xl font-bold transition-all">Güncelle</button>
            </form>
            <button onClick={() => { logout(); setShowProfileModal(false); }} className="w-full py-3 bg-red-500/10 text-red-500 rounded-2xl text-sm font-bold hover:bg-red-500 hover:text-white transition-all">Çıkış Yap</button>
            <button onClick={() => setShowProfileModal(false)} className="w-full text-xs opacity-40">Kapat</button>
          </div>
        </div>
      )}

      <Player
        state={playerState}
        onTogglePlay={() => setPlayerState(p => ({ ...p, isPlaying: !p.isPlaying }))}
        onProgressUpdate={onProgressUpdate}
        onNext={() => {
          if (playerState.currentBook && playerState.currentBook.topics) {
            const nextIndex = playerState.currentTopicIndex + 1;
            if (nextIndex < playerState.currentBook.topics.length) {
              setPlayerState(prev => ({
                ...prev,
                currentTopicIndex: nextIndex,
                progress: 0,
                currentTime: '0:00',
                isPlaying: true
              }));
            }
          }
        }}
        onPrev={() => {
          if (playerState.currentBook && playerState.currentBook.topics) {
            const prevIndex = playerState.currentTopicIndex - 1;
            if (prevIndex >= 0) {
              setPlayerState(prev => ({
                ...prev,
                currentTopicIndex: prevIndex,
                progress: 0,
                currentTime: '0:00',
                isPlaying: true
              }));
            }
          }
        }}
        onSpeedChange={(s) => {
          setPlayerState(prev => ({ ...prev, playbackSpeed: s }));
          if (currentUser) updatePlaybackSpeedInFirebase(currentUser.uid, s);
        }}
        onTopicSelect={(index) => {
          setPlayerState(prev => ({
            ...prev,
            currentTopicIndex: index,
            progress: 0,
            currentTime: '0:00',
            isPlaying: true
          }));
        }}
      />
    </div>
  );
};

export default App;
