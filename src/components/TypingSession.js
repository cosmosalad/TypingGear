import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import GearSystem from './GearSystem';

const TypingSession = () => {
  const navigate = useNavigate();
  
  const [language, setLanguage] = useState(() => localStorage.getItem('typingLanguage') || 'en');
  const [mode, setMode] = useState(() => localStorage.getItem('typingMode') || 'words');
  const [timeTarget, setTimeTarget] = useState(() => parseInt(localStorage.getItem('typingTimeTarget')) || 30);
  const [timeLeft, setTimeLeft] = useState(() => parseInt(localStorage.getItem('typingTimeTarget')) || 30);
  const [wordTarget, setWordTarget] = useState(() => parseInt(localStorage.getItem('typingWordTarget')) || 30);
  const [typingMode, setTypingMode] = useState('basic');
  const [allTexts, setAllTexts] = useState([]);
  const [currentText, setCurrentText] = useState('');
  const [wordQueue, setWordQueue] = useState([]); // [현재, 다음, 그다음] 배열
  const [userInput, setUserInput] = useState('');
  const [startTime, setStartTime] = useState(null);
  const [cpm, setCpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [previousCpm, setPreviousCpm] = useState(0);
  const [previousAccuracy, setPreviousAccuracy] = useState(100);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalCharacters, setTotalCharacters] = useState(0);
  const [correctCharacters, setCorrectCharacters] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [consecutiveCorrectWords, setConsecutiveCorrectWords] = useState(0);
  const [completedWords, setCompletedWords] = useState([]);

  const gearSystemRef = useRef(null);
  const basicInputRef = useRef(null);
  const overlayInputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('typingLanguage', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('typingMode', mode);
  }, [mode]);
  useEffect(() => {
    localStorage.setItem('typingTimeTarget', timeTarget.toString());
  }, [timeTarget]);

  useEffect(() => {
    localStorage.setItem('typingWordTarget', wordTarget.toString());
  }, [wordTarget]);

  useEffect(() => {
    if (isCompleted) return;

    if (typingMode === 'overlay') {
      overlayInputRef.current?.focus();
    } else {
      basicInputRef.current?.focus();
    }
  }, [typingMode, isLoading, isCompleted]);

  const resetPractice = useCallback(() => {
    setUserInput('');
    setStartTime(null);
    setCpm(0);
    setAccuracy(100);
    setCompletedCount(0);
    setPreviousCpm(0);
    setPreviousAccuracy(100);
    setTotalCharacters(0);
    setCorrectCharacters(0);
    setIsCompleted(false);
    setConsecutiveCorrectWords(0);
    setCompletedWords([]);
    setWordQueue([]);
    if (mode === 'time') {
      setTimeLeft(timeTarget);
    }
  }, [mode, timeTarget]);

  const handleLanguageToggle = useCallback(() => {
    const newLanguage = language === 'en' ? 'kr' : 'en';
    setLanguage(newLanguage);
    resetPractice();
    setTimeout(() => {
      if (typingMode === 'overlay') {
        overlayInputRef.current?.focus();
      } else {
        basicInputRef.current?.focus();
      }
    }, 100);
  }, [language, typingMode, resetPractice]);
  
  const getRandomText = useCallback((excludeTexts = []) => {
    if (allTexts.length === 0) return '';
    let availableTexts = allTexts;
    if (excludeTexts.length > 0 && allTexts.length > excludeTexts.length) {
      availableTexts = allTexts.filter(text => {
        const textContent = mode === 'sentences' ? text.text : text;
        return !excludeTexts.includes(textContent);
      });
    }
    if (availableTexts.length === 0) availableTexts = allTexts; // 리셋
    const randomIndex = Math.floor(Math.random() * availableTexts.length);
    const selectedText = availableTexts[randomIndex];
    return mode === 'sentences' ? selectedText.text : selectedText;
  }, [allTexts, mode]);
  
  // MODIFICATION 1: `initializeWordQueue` LOGIC UPDATED
  const initializeWordQueue = useCallback(() => {
    if (allTexts.length === 0) return;

    if (mode === 'sentences') {
      // In sentence mode, don't use a queue, just set the text directly
      const randomText = getRandomText([]);
      setCurrentText(randomText);
      setWordQueue([]); // Clear the queue in sentence mode
    } else {
      // Only use the queue in word/time mode
      const queue = [];
      const usedTexts = [];
      for (let i = 0; i < 3; i++) {
        const newText = getRandomText(usedTexts);
        queue.push(newText);
        usedTexts.push(newText);
      }
      setWordQueue(queue);
      setCurrentText(queue[0]);
    }
  }, [allTexts, getRandomText, mode]);

  useEffect(() => {
    const dataFile = mode === 'time' ? 'words' : mode;
    if (language && dataFile) {
      setIsLoading(true);
      setCurrentText(''); // Clear current text while loading new data
      resetPractice();
      import(`../data/${language}/${dataFile}.json`)
        .then(module => {
          const categories = module.default.categories;
          let texts = [];
          categories.forEach(category => {
            if (dataFile === 'sentences') {
              if (category.sentences && Array.isArray(category.sentences)) {
                texts = texts.concat(category.sentences);
              }
            } else {
              if (category.words && Array.isArray(category.words)) {
                texts = texts.concat(category.words);
              }
            }
          });
          setAllTexts(texts);
          setIsLoading(false);
        })
        .catch(error => {
          console.error('Error loading JSON:', error);
          setIsLoading(false);
        });
    }
  }, [language, mode, resetPractice]);
  
  useEffect(() => {
    if (allTexts.length > 0 && !isCompleted) {
      initializeWordQueue();
    }
  }, [allTexts, isCompleted, initializeWordQueue]);

  useEffect(() => {
      if (mode === 'time' && startTime && !isCompleted) {
          setTimeLeft(timeTarget); 
          const timer = setInterval(() => {
              setTimeLeft(prevTime => {
                  if (prevTime <= 1) {
                      clearInterval(timer);
                      setIsCompleted(true);
                      // calculateAccuracy() 대신 직접 계산
                      const finalAccuracy = totalCharacters === 0 ? 100 : Math.round((correctCharacters / totalCharacters) * 100);
                      setAccuracy(finalAccuracy);
                      setPreviousAccuracy(finalAccuracy);
                      setPreviousCpm(completedCount);
                      return 0;
                  }
                  return prevTime - 1;
              });
          }, 1000);
          return () => clearInterval(timer);
      }
  }, [mode, startTime, isCompleted, timeTarget, totalCharacters, correctCharacters, completedCount]);

  const countKoreanCharacters = useCallback((text) => {
    if (!text || typeof text !== 'string') return 0;
    let count = 0;
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      if (charCode >= 0xAC00 && charCode <= 0xD7A3) {
        const syllableCode = charCode - 0xAC00;
        const jong = syllableCode % 28;
        count += jong === 0 ? 2 : 3;
      } else if ((charCode >= 0x3131 && charCode <= 0x314E) || (charCode >= 0x314F && charCode <= 0x3163)) {
        count += 1;
      } else {
        count += 1;
      }
    }
    return count;
  }, []);

  const calculateCPM = useCallback(() => {
    if (startTime) {
      const now = Date.now();
      const timeElapsed = (now - startTime) / 60000;
      if (timeElapsed === 0) return 0;

      if (mode === 'words' || mode === 'time') {
        let completedWordsChars = 0;
        for (const word of completedWords) {
            completedWordsChars += language === 'kr' ? countKoreanCharacters(word) : word.length;
        }
        const currentChars = language === 'kr' ? countKoreanCharacters(userInput) : userInput.length;
        const totalChars = completedWordsChars + currentChars;
        return Math.round(totalChars / timeElapsed);
      } else {
        const characters = language === 'kr' ? countKoreanCharacters(userInput) : userInput.length;
        return Math.round(characters / timeElapsed);
      }
    }
    return 0;
  }, [startTime, userInput, language, countKoreanCharacters, mode, completedWords]);

  const calculateAccuracy = useCallback(() => {
    if (mode === 'words' || mode === 'time' || mode === 'sentences') { // Sentences included for final calc
      if (totalCharacters === 0) return 100;
      return Math.round((correctCharacters / totalCharacters) * 100);
    } else {
      if (userInput.length === 0) return 100;
      let correct = 0;
      for (let i = 0; i < userInput.length; i++) {
        if (userInput[i] === currentText[i]) {
          correct++;
        }
      }
      return Math.round((correct / userInput.length) * 100);
    }
  }, [mode, totalCharacters, correctCharacters, userInput, currentText]);

  useEffect(() => {
    if (startTime && !isCompleted && mode !== 'time') {
      const interval = setInterval(() => {
        setCpm(calculateCPM());
        if (mode !== 'words') {
          setAccuracy(calculateAccuracy());
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [calculateCPM, calculateAccuracy, startTime, isCompleted, mode]);
    
  const moveToNextText = useCallback(() => {
    const isCorrect = userInput === currentText;

    if (isCorrect) {
      if (mode !== 'sentences') {
        const newConsecutiveCount = consecutiveCorrectWords + 1;
        if (newConsecutiveCount >= 10) {
          gearSystemRef.current?.addGear();
          setConsecutiveCorrectWords(0);
        } else {
          setConsecutiveCorrectWords(newConsecutiveCount);
        }
      } else {
        gearSystemRef.current?.addGear();
      }
    } else {
      if (mode !== 'sentences') {
        setConsecutiveCorrectWords(0);
      }
    }

    const newCompletedCount = completedCount + 1;

    if ((mode === 'words' || mode === 'time' || mode === 'sentences') && currentText) {
      setCompletedWords(prev => [...prev, currentText]);
      const wordLength = language === 'kr' ? countKoreanCharacters(currentText) : currentText.length;
      setTotalCharacters(prev => prev + wordLength);
      if (isCorrect) {
        setCorrectCharacters(prev => prev + wordLength);
      }
    }

    if (mode === 'words' && newCompletedCount >= wordTarget) {
      const finalCpm = calculateCPM();
      const finalAccuracy = calculateAccuracy();
      setPreviousCpm(finalCpm);
      setPreviousAccuracy(finalAccuracy);
      setCpm(finalCpm);
      setAccuracy(finalAccuracy);
      setIsCompleted(true);
      return;
    }

    if (mode !== 'sentences') {
      if (wordQueue.length >= 2) { // Logic adjusted for queue handling
        const currentWords = wordQueue.map(w => w);
        const newWord = getRandomText(currentWords);
        const newQueue = [...wordQueue.slice(1), newWord];
        setWordQueue(newQueue);
        setCurrentText(newQueue[0]);
      } else { // Fallback if queue is smaller than expected
        initializeWordQueue();
      }
      setUserInput('');
      setCompletedCount(newCompletedCount);
    } else {
      const finalCpm = cpm;
      // For sentences, calculate accuracy at the end of each sentence
      const finalAccuracy = calculateAccuracy();
      setPreviousCpm(finalCpm);
      setPreviousAccuracy(finalAccuracy);
      const newCurrentText = getRandomText([currentText]);
      setCurrentText(newCurrentText);
      setUserInput('');
      setCompletedCount(newCompletedCount);
      setStartTime(null);
      setCpm(0);
    }
  }, [
    mode, wordTarget, getRandomText, cpm, accuracy,
    completedCount, calculateCPM, currentText, userInput, language,
    countKoreanCharacters, calculateAccuracy, consecutiveCorrectWords, wordQueue, initializeWordQueue
  ]);

  const handleModeChange = useCallback((newMode) => {
    if (newMode === mode) return;
    setMode(newMode);
    // resetPractice is now called inside the main useEffect for language/mode changes
    setTimeout(() => {
      if (typingMode === 'overlay') {
        overlayInputRef.current?.focus();
      } else {
        basicInputRef.current?.focus();
      }
    }, 100);
  }, [mode, typingMode]);

  const handleInputChange = useCallback((e) => {
    const input = e.target.value;
    if (isCompleted) return;

    if (mode === 'sentences') {
        if (!startTime && input.length > 0) {
            setStartTime(Date.now());
        }
        setUserInput(input);
        return;
    }

    if (currentText && input.length <= currentText.length) {
      if (!startTime && input.length > 0) {
        setStartTime(Date.now());
      }
      setUserInput(input);
    }
  }, [startTime, currentText, mode, isCompleted]);

  const checkCompletion = useCallback(() => {
    if (currentText && userInput.trim() !== '') {
        if (mode === 'sentences') {
            if (userInput.length >= currentText.length || userInput === currentText) {
                moveToNextText();
                return true;
            }
        } else {
            moveToNextText();
            return true;
        }
    }
    return false;
  }, [userInput, currentText, moveToNextText, mode]);
    
  const handleKeyDown = useCallback((e) => {
    if (e.key === '-') {
      e.preventDefault();
      gearSystemRef.current?.addGear();
      return;
    }

    const isWordOrTimeMode = mode === 'words' || mode === 'time';

    if ((e.key === 'Enter' && mode === 'sentences') || 
        (e.key === ' ' && isWordOrTimeMode) ||
        (e.key === 'Enter' && isWordOrTimeMode) ||
        (e.key === ' ' && mode === 'sentences' && userInput.length >= currentText.length)) { 
        e.preventDefault();
        checkCompletion();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setUserInput('');
    }
  }, [checkCompletion, mode, userInput, currentText]);
  
  const findCurrentWordBoundaries = useCallback((text, cursorIndex) => {
    if (!text || typeof text !== 'string') return { start: 0, end: 0 };
    let start = cursorIndex;
    let end = cursorIndex;
    while (start > 0 && !/\s/.test(text[start - 1])) {
      start--;
    }
    while (end < text.length && !/\s/.test(text[end])) {
      end++;
    }
    return { start, end };
  }, []);

  const renderCurrentText = useCallback(() => {
    if (!currentText || typeof currentText !== 'string') return null;
    const { start: wordStart, end: wordEnd } = findCurrentWordBoundaries(currentText, userInput.length);
    if (typingMode === 'overlay') {
      const maxLength = Math.max(currentText.length, userInput.length);
      const result = [];
      for (let index = 0; index < maxLength; index++) {
        const originalChar = currentText[index];
        const typedChar = userInput[index];
        let displayChar = '';
        let className = 'transition-all duration-200';
        let showCursor = false;
        if (index < userInput.length) {
          displayChar = typedChar === ' ' ? '\u00A0' : typedChar;
          if (originalChar && typedChar === originalChar) {
            className += ' text-gray-700';
          } else {
            if (language === 'kr' && index === userInput.length - 1 && originalChar) {
              className += ' text-gray-500';
            } else {
              className += ' text-red-500 bg-red-100 rounded px-1';
            }
          }
        } else if (index < currentText.length) {
          displayChar = originalChar === ' ' ? '\u00A0' : originalChar;
          className += ' text-gray-400';
          if (index === userInput.length) {
            showCursor = true;
          }
        }
        if (displayChar) {
          result.push(
            <span key={index} className={`relative ${className}`} style={{ whiteSpace: 'pre' }}>
              {displayChar}
              {showCursor && (
                <span className="absolute top-1/2 left-0 transform -translate-y-1/2 w-0.5 h-8 bg-gray-600 animate-pulse"></span>
              )}
            </span>
          );
        }
      }
      if (userInput.length >= currentText.length) {
        result.push(
          <span key="end-cursor" className="relative inline-block h-8">
            <span className="absolute top-1/2 left-0 transform -translate-y-1/2 w-0.5 h-8 bg-gray-600 animate-pulse"></span>
          </span>
        );
      }
      return result;
    } else {
      return currentText.split('').map((char, index) => {
        let className = 'text-gray-400 transition-all duration-200';
        let underline = false;
        if (index < userInput.length) {
          if (char === userInput[index]) {
            className = 'text-gray-700 transition-all duration-200';
          } else {
            if (language === 'kr' && index === userInput.length - 1) {
              className = 'text-gray-500';
            } else {
              className = 'text-red-500 transition-all duration-200';
            }
          }
        }
        if (mode !== 'sentences' && index >= wordStart && index < wordEnd && index >= userInput.length) {
          underline = true;
        }
        const displayChar = char === ' ' ? '\u00A0' : char;
        return (
          <span key={index} className={`relative ${className}`} style={{ whiteSpace: 'pre' }}>
            {displayChar}
            {underline && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-600 transition-all duration-200"></span>
            )}
          </span>
        );
      });
    }
  }, [currentText, userInput, language, mode, typingMode, findCurrentWordBoundaries]);

  // MODIFICATION 2: `renderNextWords` LOGIC UPDATED
  const renderNextWords = useCallback(() => {
    if (mode === 'sentences' || wordQueue.length < 2) return null;
    return (
      <>
        <span className="text-gray-400 text-2xl ml-4 opacity-50">
          {wordQueue[1]}
        </span>
        {wordQueue.length >= 3 && (
          <span className="text-gray-400 text-2xl ml-4 opacity-30">
            {wordQueue[2]}
          </span>
        )}
      </>
    );
  }, [mode, wordQueue]);

  const handleContainerClick = useCallback((e) => {
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') {
      return;
    }
    
    if (typingMode === 'overlay') {
      overlayInputRef.current?.focus();
    } else {
      basicInputRef.current?.focus();
    }
  }, [typingMode]);

  const handleGoBack = useCallback(() => {
    navigate('/');
  }, [navigate]);

return (
    <div
      className="relative flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 overflow-hidden"
      onClick={handleContainerClick}
    >
      <GearSystem ref={gearSystemRef} />

      {allTexts.length === 0 && !isLoading ? (
        <div className="relative z-10 flex flex-col items-center">
          <div className="text-2xl text-gray-600 mb-4">데이터를 불러올 수 없습니다.</div>
          <button
            onClick={handleGoBack}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition duration-300 ease-in-out transform hover:scale-105 active:scale-95"
          >
            홈으로 돌아가기
          </button>
        </div>
      ) : (
        <div className="relative z-10 w-full max-w-4xl">
           {/* MODIFICATION 3: PREVIOUS ACCURACY DISPLAY ADDED */}
          <div className="mb-6 flex justify-between items-center">
            <div className="flex space-x-4 text-lg font-semibold">
                {mode === 'time' && <span className="text-gray-700">남은 시간: {timeLeft}초</span>}
                {mode === 'words' && <span className="text-gray-700">타수: {cpm} CPM</span>}
                {mode === 'sentences' && <span className="text-gray-700">타수: {cpm} CPM</span>}
                {mode !== 'time' && previousCpm > 0 && (
                  <span className="text-gray-500">
                    이전: {previousCpm} CPM / {previousAccuracy}%
                  </span>
                )}
            </div>
          </div>
            <div className="mb-6 min-h-16 flex justify-between items-center">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => setTypingMode(typingMode === 'basic' ? 'overlay' : 'basic')}
                        className="px-6 py-3 rounded-lg font-medium transition-all duration-300 ease-out bg-gray-700 text-white hover:bg-gray-800 shadow-lg transform hover:scale-105 active:scale-100 whitespace-nowrap"
                    >
                        {typingMode === 'basic' ? '기본모드' : '겹쳐모드'}
                    </button>
                    <button
                        onClick={handleLanguageToggle}
                        className="w-[100px] h-[48px] rounded-lg font-medium transition-colors duration-150 ease-out bg-gray-500 text-white hover:bg-gray-600 shadow-md flex items-center justify-center"
                    >
                        {language === 'en' ? '🇺🇸 EN' : '🇰🇷 KR'}
                    </button>
                </div>

                <div className="flex items-center space-x-2">
                    <div className="flex items-center p-1 bg-gray-200 rounded-lg space-x-1">
                        {['time', 'words', 'sentences'].map(modeName => (
                            <button
                                key={modeName}
                                onClick={() => handleModeChange(modeName)}
                                className={`px-4 h-10 rounded-md font-medium text-sm transition-all duration-200 ${
                                    mode === modeName ? 'bg-white text-gray-800 shadow-sm' : 'bg-transparent text-gray-500 hover:bg-white/50'
                                }`}
                            >
                                {modeName === 'time' && '시간'}
                                {modeName === 'words' && '단어'}
                                {modeName === 'sentences' && '문장'}
                            </button>
                        ))}
                    </div>

                    <div className="relative h-[48px] w-[220px]">
                        <div className={`absolute inset-0 flex items-center justify-start space-x-2 transition-all duration-300 ease-in-out ${mode === 'time' ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-3 pointer-events-none'}`}>
                            {[30, 60, 120].map(target => (
                            <button
                                key={`time-${target}`}
                                onClick={() => { 
                                  setTimeTarget(target);
                                  setTimeout(() => {
                                    if (typingMode === 'overlay') {
                                      overlayInputRef.current?.focus();
                                    } else {
                                      basicInputRef.current?.focus();
                                    }
                                  }, 100);
                                }}
                                className={`w-[65px] h-11 rounded-lg font-medium transition-colors duration-150 ease-out flex items-center justify-center ${
                                    timeTarget === target ? 'bg-gray-600 text-white shadow-md' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                                }`}
                            >
                                {target}초
                            </button>
                            ))}
                        </div>
                        <div className={`absolute inset-0 flex items-center justify-start space-x-2 transition-all duration-300 ease-in-out ${mode === 'words' ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-3 pointer-events-none'}`}>
                            {[30, 50, 100].map(target => (
                            <button
                                key={`word-${target}`}
                                onClick={() => { 
                                  setWordTarget(target);
                                  setTimeout(() => {
                                    if (typingMode === 'overlay') {
                                      overlayInputRef.current?.focus();
                                    } else {
                                      basicInputRef.current?.focus();
                                    }
                                  }, 100);
                                }}
                                className={`w-[65px] h-11 rounded-lg font-medium transition-colors duration-150 ease-out flex items-center justify-center ${
                                    wordTarget === target ? 'bg-gray-600 text-white shadow-md' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                                }`}
                            >
                                {target}개
                            </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            
          {/* MODIFICATION 4: LOADING CONDITION UPDATED */}
          <div className="mb-6 bg-white p-6 rounded-lg shadow border border-gray-200">
            <div className={`text-2xl leading-relaxed flex items-center whitespace-pre-wrap min-h-[3rem] ${isLoading ? 'opacity-50' : ''}`}>
              {isLoading ? (
                <span className="text-gray-400">새로운 텍스트 불러오는 중...</span>
              ) : !currentText ? (
                <span className="text-gray-400">텍스트를 불러오는 중...</span>
              ) : (
                <>
                  {renderCurrentText()}
                  {renderNextWords()}
                </>
              )}
            </div>
            
            <div 
              className={`transition-all duration-300 ease-in-out overflow-hidden border-t border-gray-200 ${
                typingMode === 'overlay' ? 'max-h-0 opacity-0 pt-0' : 'max-h-20 opacity-100 pt-4'
              }`}
            >
              <div className="relative w-full">
                <input
                  ref={basicInputRef}
                  type="text"
                  disabled={isLoading || isCompleted || typingMode === 'overlay'}
                  value={userInput}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  className={`w-full text-2xl bg-transparent focus:outline-none placeholder-gray-400 ${isLoading || isCompleted ? 'opacity-50' : ''}`}
                  placeholder={mode === 'sentences' ? "문장을 입력하세요." : "단어를 입력하세요."}
                />
              </div>
            </div>
          </div>

          {typingMode === 'overlay' && (
            <input
              ref={overlayInputRef}
              type="text"
              disabled={isLoading || isCompleted}
              value={userInput}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="opacity-0 absolute -z-10 pointer-events-none"
            />
          )}

          <div className="flex justify-between items-center text-lg text-gray-600">
            <span className="font-semibold">
              {mode === 'words' && `진행률: ${completedCount}/${wordTarget}개`}
              {mode === 'time' && `완료한 단어: ${completedCount}개`}
              {mode === 'sentences' && `완료한 문장: ${completedCount}개`}
            </span>
            <div className="flex items-center space-x-4">
                {mode === 'sentences' && currentText && (
                    <span className="text-sm text-gray-500 italic">
                    # {(() => {
                        const sentence = allTexts.find(item => item && item.text === currentText);
                        return sentence ? sentence.source : '알 수 없음';
                    })()}
                    </span>
                )}
                <span className="text-sm text-gray-500">연속 정타: {consecutiveCorrectWords}개</span>
            </div>
          </div>
        </div>
      )}

      {isCompleted && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-all duration-300">
          <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md w-full mx-4 border border-gray-200 transform transition-all duration-300 scale-100">
            <h2 className="text-3xl font-bold mb-6 text-gray-800">
              {mode === 'time' ? '시간 종료!' : '목표 달성!'}
            </h2>
            <div className="mb-6 space-y-4">
              <div className="text-lg text-gray-700">
                <span className="font-semibold">
                    {mode === 'words' && `${wordTarget}개 단어 완료!`}
                    {mode === 'time' && `${timeTarget}초 동안의 결과입니다.`}
                    {mode === 'sentences' && '문장 입력 완료!'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xl">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="text-gray-700 font-bold text-2xl">
                    {mode === 'time' ? completedCount : cpm}
                  </div>
                  <div className="text-gray-600 text-sm">
                    {mode === 'time' ? '완료 단어' : 'CPM'}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="text-gray-700 font-bold text-2xl">{accuracy}%</div>
                  <div className="text-gray-600 text-sm">정확도</div>
                </div>
              </div>
            </div>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => {
                  resetPractice();
                  initializeWordQueue();
                }}
                className="px-6 py-3 bg-gray-700 text-white rounded-lg shadow text-lg font-semibold transition-all duration-300 ease-out hover:bg-gray-800 transform hover:scale-105 active:scale-100"
              >
                다시 시작
              </button>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg shadow text-lg font-semibold transition-all duration-300 ease-out hover:bg-gray-300 transform hover:scale-105 active:scale-100"
              >
                홈으로
              </button>
            </div>
          </div>
        </div>
      )}

      {!isCompleted && (
        <button
          onClick={handleGoBack}
          className="relative z-10 mt-8 px-4 py-2 bg-gray-700 text-white rounded-lg font-medium transition-all duration-300 ease-out hover:bg-gray-800 transform hover:scale-105 active:scale-100"
        >
          홈으로 돌아가기
        </button>
      )}
    </div>
  );
};

export default TypingSession;