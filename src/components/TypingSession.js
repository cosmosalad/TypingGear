import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import GearSystem from './GearSystem';

const TypingSession = () => {
  const navigate = useNavigate();
  const { language: initialLanguage } = useParams();
  const [language, setLanguage] = useState(initialLanguage || 'en');
  const [mode, setMode] = useState('words');
  const [wordTarget, setWordTarget] = useState(30);
  const [typingMode, setTypingMode] = useState('basic');
  const [allTexts, setAllTexts] = useState([]);
  const [currentText, setCurrentText] = useState('');
  const [nextText, setNextText] = useState('');
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

  // 1. (추가) 연속 정타 단어 카운트를 위한 state
  const [consecutiveCorrectWords, setConsecutiveCorrectWords] = useState(0);

  const gearSystemRef = useRef(null);

  // 2. (삭제) 기존의 기어 드랍을 실행시키던 useEffect는 삭제합니다.
  /* useEffect(() => { ... }, [completedCount, mode]); 
  */

  const handleLanguageToggle = useCallback(() => {
    const newLanguage = language === 'en' ? 'kr' : 'en';
    setLanguage(newLanguage);
    navigate(`/practice/${newLanguage}`, { replace: true });
    setCurrentText('');
    setNextText('');
    setAllTexts([]);
    resetPractice();
  }, [language, navigate]);

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
    setConsecutiveCorrectWords(0); // 연속 카운트도 리셋
  }, []);

  const getRandomText = useCallback((excludeCurrent = true) => {
    if (allTexts.length === 0) return '';
    let availableTexts = allTexts;
    if (excludeCurrent && allTexts.length > 1) {
      availableTexts = allTexts.filter(text => {
        const textContent = mode === 'sentences' ? text.text : text;
        return textContent !== currentText;
      });
    }
    const randomIndex = Math.floor(Math.random() * availableTexts.length);
    const selectedText = availableTexts[randomIndex];
    return mode === 'sentences' ? selectedText.text : selectedText;
  }, [allTexts, currentText, mode]);

  const setNextRandomText = useCallback(() => {
    const nextRandomText = getRandomText(true);
    setNextText(nextRandomText);
  }, [getRandomText]);

  useEffect(() => {
    if (language && mode) {
      setIsLoading(true);
      import(`../data/${language}/${mode}.json`)
        .then(module => {
          const categories = module.default.categories;
          let texts = [];
          categories.forEach(category => {
            if (mode === 'sentences') {
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
          if (texts.length > 0) {
            const randomIndex = Math.floor(Math.random() * texts.length);
            const firstText = mode === 'sentences' ? texts[randomIndex].text : texts[randomIndex];
            setCurrentText(firstText);
            if (mode === 'words' && texts.length > 1) {
              const nextRandomIndex = (randomIndex + 1) % texts.length;
              setNextText(texts[nextRandomIndex]);
            } else if (mode === 'sentences' && texts.length > 1) {
              const nextRandomIndex = (randomIndex + 1) % texts.length;
              setNextText(texts[nextRandomIndex].text);
            }
          }
          resetPractice();
          setIsLoading(false);
        })
        .catch(error => {
          console.error('Error loading JSON:', error);
          setIsLoading(false);
        });
    }
  }, [language, mode, resetPractice]);

  useEffect(() => {
    if (allTexts.length > 0 && currentText) {
      setNextRandomText();
    }
  }, [allTexts, currentText, setNextRandomText]);

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
      let characters = 0;
      if (mode === 'words') {
        let completedWordsChars = 0;
        for (let i = 0; i < completedCount; i++) {
          completedWordsChars += 5;
        }
        if (language === 'kr') {
          characters = completedWordsChars + countKoreanCharacters(userInput);
        } else {
          characters = completedWordsChars + userInput.length;
        }
      } else {
        if (language === 'kr') {
          characters = countKoreanCharacters(userInput);
        } else {
          characters = userInput.length;
        }
      }
      return timeElapsed > 0 ? Math.round(characters / timeElapsed) : 0;
    }
    return 0;
  }, [startTime, userInput, language, countKoreanCharacters, mode, completedCount]);

  const calculateAccuracy = useCallback(() => {
    if (mode === 'words') {
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
    if (startTime && !isCompleted) {
      const interval = setInterval(() => {
        setCpm(calculateCPM());
        setAccuracy(calculateAccuracy());
      }, 100);
      return () => clearInterval(interval);
    }
  }, [calculateCPM, calculateAccuracy, startTime, isCompleted]);

  // 3. (수정) 다음 텍스트로 넘어갈 때의 로직 수정
  const moveToNextText = useCallback(() => {
    const isCorrect = userInput === currentText;

    // --- 기어 생성 로직 ---
    if (isCorrect) {
      if (mode === 'words') {
        const newConsecutiveCount = consecutiveCorrectWords + 1;
        if (newConsecutiveCount >= 10) {
          gearSystemRef.current?.addGear();
          setConsecutiveCorrectWords(0); // 10개 채우면 리셋
        } else {
          setConsecutiveCorrectWords(newConsecutiveCount);
        }
      } else { // 문장 모드
        gearSystemRef.current?.addGear();
      }
    } else {
      // 틀렸을 경우, 단어 모드에서 연속 카운트 리셋
      if (mode === 'words') {
        setConsecutiveCorrectWords(0);
      }
    }
    // --- 기어 생성 로직 끝 ---

    const newCompletedCount = completedCount + 1;
    const currentCpm = calculateCPM();
    const finalCpm = mode === 'words' ? currentCpm : cpm;

    if (mode === 'words' && currentText) {
      const wordLength = language === 'kr' ? countKoreanCharacters(currentText) : currentText.length;
      setTotalCharacters(prev => prev + wordLength);
      if (isCorrect) {
        setCorrectCharacters(prev => prev + wordLength);
      }
    }

    if (mode === 'words' && newCompletedCount >= wordTarget) {
      setPreviousCpm(finalCpm);
      setPreviousAccuracy(calculateAccuracy());
      setCpm(finalCpm);
      setIsCompleted(true);
      return;
    }

    if (mode === 'words') {
      if (nextText) {
        setCurrentText(nextText);
        setNextRandomText();
      }
      setUserInput('');
      setCompletedCount(newCompletedCount);
    } else {
      setPreviousCpm(finalCpm);
      setPreviousAccuracy(accuracy);
      const newCurrentText = getRandomText(true);
      setCurrentText(newCurrentText);
      setUserInput('');
      setCompletedCount(newCompletedCount);
      setStartTime(null);
      setCpm(0);
    }
  }, [
    mode, wordTarget, nextText, getRandomText, setNextRandomText, cpm, accuracy,
    completedCount, calculateCPM, currentText, userInput, language,
    countKoreanCharacters, calculateAccuracy, consecutiveCorrectWords
  ]);

  const handleModeChange = useCallback((newMode) => {
    if (newMode === mode) return;
    setMode(newMode);
    setCurrentText('');
    setNextText('');
    resetPractice();
  }, [resetPractice, mode]);

  const handleInputChange = useCallback((e) => {
    const input = e.target.value;
    if (currentText && input.length <= currentText.length) {
      if (!startTime && input.length > 0) {
        setStartTime(Date.now());
      }
      setUserInput(input);
    }
  }, [startTime, currentText]);

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
        if (mode === 'words' && index >= wordStart && index < wordEnd && index >= userInput.length) {
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

  const renderNextWord = useCallback(() => {
    if (mode !== 'words' || !nextText) return null;
    return (
      <span className="text-gray-400 text-xl ml-4 opacity-50">
        {nextText}
      </span>
    );
  }, [mode, nextText]);

  const checkCompletion = useCallback(() => {
    if (currentText && (userInput === currentText || userInput.length === currentText.length)) {
      const currentWordLength = language === 'kr' ? countKoreanCharacters(currentText) : currentText.length;
      if (mode === 'words' && startTime) {
        const now = Date.now();
        const timeElapsed = (now - startTime) / 60000;
        let totalChars = completedCount * 5 + currentWordLength;
        const newCpm = timeElapsed > 0 ? Math.round(totalChars / timeElapsed) : 0;
        setCpm(newCpm);
      }
      moveToNextText();
      return true;
    }
    return false;
  }, [userInput, currentText, moveToNextText, language, countKoreanCharacters, mode, startTime, completedCount]);

  const handleKeyDown = useCallback((e) => {

    // --- 테스트용 코드 시작: '-' 키로 기어 생성 (나중에 이 블록을 지우세요) ---
    if (e.key === '-') {
      e.preventDefault(); // 입력창에 '-'가 쳐지는 것을 막습니다.
      gearSystemRef.current?.addGear();
      return; // 다른 키보드 로직이 실행되지 않도록 여기서 종료합니다.
    }
    // --- 테스트용 코드 끝 ---

    if (e.key === 'Enter') {
      e.preventDefault();
      if (mode === 'words' && startTime) {
        const now = Date.now();
        const timeElapsed = (now - startTime) / 60000;
        let totalChars = completedCount * 5;
        if (currentText && (userInput === currentText || userInput.length === currentText.length)) {
          totalChars += (language === 'kr' ? countKoreanCharacters(currentText) : currentText.length) + 1;
        } else {
          totalChars += (language === 'kr' ? countKoreanCharacters(userInput) : userInput.length) + 1;
        }
        const newCpm = timeElapsed > 0 ? Math.round(totalChars / timeElapsed) : 0;
        setCpm(newCpm);
      }
      checkCompletion();
    } else if (e.key === ' ') {
      if (mode === 'words') {
        e.preventDefault();
        if (startTime) {
          const now = Date.now();
          const timeElapsed = (now - startTime) / 60000;
          let totalChars = completedCount * 5;
          if (currentText && (userInput === currentText || userInput.length === currentText.length)) {
            totalChars += (language === 'kr' ? countKoreanCharacters(currentText) : currentText.length) + 1;
          } else {
            totalChars += (language === 'kr' ? countKoreanCharacters(userInput) : userInput.length) + 1;
          }
          const newCpm = timeElapsed > 0 ? Math.round(totalChars / timeElapsed) : 0;
          setCpm(newCpm);
        }
        checkCompletion();
      } else if (mode === 'sentences' && (userInput === currentText || userInput.length === currentText.length)) {
        e.preventDefault();
        checkCompletion();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setUserInput('');
    }
  }, [checkCompletion, mode, userInput, currentText, startTime, completedCount, language, countKoreanCharacters]);

  const handleContainerClick = useCallback((e) => {
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') {
      return;
    }
    const inputElement = typingMode === 'overlay'
      ? document.querySelector('input.opacity-0')
      : document.querySelector('input[type="text"]');
    if (inputElement) {
      inputElement.focus();
    }
  }, [typingMode]);

  const handleGoBack = useCallback(() => {
    navigate('/');
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="text-2xl text-gray-600">데이터를 불러오는 중...</div>
      </div>
    );
  }

  if (allTexts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="text-2xl text-gray-600 mb-4">데이터를 불러올 수 없습니다.</div>
        <button
          onClick={handleGoBack}
          className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition duration-300 ease-in-out transform hover:scale-105 active:scale-95"
        >
          홈으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div
      className="relative flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 overflow-hidden"
      onClick={handleContainerClick}
    >
      <GearSystem ref={gearSystemRef} />

      <div className="relative z-10 w-full max-w-4xl">
        <div className="mb-6 flex justify-between items-center">
          <div className="flex space-x-4 text-lg font-semibold">
            <span className="text-gray-700">현재: {cpm} CPM</span>
            
            {/* '단어' 모드가 아닐 때만 정확도 표시 */}
            {mode !== 'words' && <span className="text-gray-600">정확도: {accuracy}%</span>}
            
            {previousCpm > 0 && (
              <span className="text-gray-500">이전: {previousCpm} CPM</span>
            )}

            {/* '단어' 모드가 아닐 때만 이전 정확도 표시 */}
            {mode !== 'words' && previousAccuracy < 100 && (
              <span className="text-gray-500">이전 정확도: {previousAccuracy}%</span>
            )}
          </div>
        </div>

        <div className="mb-6 min-h-16">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setTypingMode(typingMode === 'basic' ? 'overlay' : 'basic')}
                className="px-8 py-3 rounded-lg font-medium transition-all duration-300 ease-out bg-gray-700 text-white hover:bg-gray-800 shadow-lg transform hover:scale-105 active:scale-100 whitespace-nowrap min-w-[120px]"
              >
                <span className="transition-all duration-300">
                  {typingMode === 'basic' ? '기본모드' : '겹쳐모드'}
                </span>
              </button>

              <button
                onClick={handleLanguageToggle}
                className="px-6 py-3 rounded-lg font-medium transition-all duration-300 ease-out bg-gray-500 text-white hover:bg-gray-600 shadow-md transform hover:scale-105 active:scale-100 whitespace-nowrap min-w-[100px]"
              >
                {language === 'en' ? '🇺🇸 EN' : '🇰🇷 KR'}
              </button>

              <div className="w-64">
                {mode === 'sentences' && currentText && (
                  <div className="bg-gray-100 px-4 py-2 rounded-lg border border-gray-200">
                    <span className="text-sm text-gray-600 italic whitespace-nowrap overflow-hidden text-ellipsis block">
                      # {(() => {
                        const currentSentence = allTexts.find(item => item.text === currentText);
                        return currentSentence ? currentSentence.source : '알 수 없음';
                      })()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center" style={{ width: '400px' }}>
              <div className="flex space-x-2 justify-end" style={{ width: '220px' }}>
                {mode === 'words' && (
                  <>
                    {[30, 50, 100].map(target => (
                      <button
                        key={target}
                        onClick={() => {
                          setWordTarget(target);
                          resetPractice();
                        }}
                        className={`px-4 py-3 rounded-lg font-medium transition-all duration-300 ease-out transform hover:scale-105 active:scale-100 whitespace-nowrap ${
                          wordTarget === target
                            ? 'bg-gray-600 text-white hover:bg-gray-700 shadow-md'
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                        }`}
                        style={{ width: '65px' }}
                      >
                        {target}개
                      </button>
                    ))}
                  </>
                )}
              </div>

              <div className="flex space-x-2 ml-4">
                <button
                  onClick={() => handleModeChange('words')}
                  className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ease-out transform hover:scale-105 active:scale-100 whitespace-nowrap ${
                    mode === 'words'
                      ? 'bg-gray-700 text-white hover:bg-gray-800 shadow-md'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                  style={{ width: '80px' }}
                >
                  단어
                </button>
                <button
                  onClick={() => handleModeChange('sentences')}
                  className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ease-out transform hover:scale-105 active:scale-100 whitespace-nowrap ${
                    mode === 'sentences'
                      ? 'bg-gray-700 text-white hover:bg-gray-800 shadow-md'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                  style={{ width: '80px' }}
                >
                  문장
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 text-2xl leading-relaxed bg-white p-6 rounded-lg shadow flex items-center whitespace-pre-wrap transition-all duration-500 ease-out border border-gray-200">
          {renderCurrentText()}
          {renderNextWord()}
        </div>

        <div className={`transition-all duration-500 ease-out ${
          typingMode !== 'overlay'
            ? 'opacity-100 transform translate-y-0 mb-4'
            : 'opacity-0 transform translate-y-4 h-0 overflow-hidden'
        }`}>
          {typingMode !== 'overlay' && (
            <div className="relative w-full">
              <div className="absolute inset-0 bg-white border-2 border-gray-300 rounded-lg shadow"></div>
              <input
                type="text"
                value={userInput}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                className="relative w-full p-4 text-xl bg-transparent focus:outline-none focus:border-gray-500 transition-all duration-300"
                placeholder={mode === 'words' ? "단어를 입력하고 스페이스바나 엔터를 누르세요..." : "문장을 입력하고 엔터를 누르세요..."}
                autoFocus
              />
            </div>
          )}
        </div>

        {typingMode === 'overlay' && (
          <input
            type="text"
            value={userInput}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="opacity-0 absolute -z-10 pointer-events-none"
            autoFocus
          />
        )}

        <div className="flex justify-between items-center text-lg text-gray-600">
          <span>
            {mode === 'words'
              ? `진행률: ${completedCount}/${wordTarget}개`
              : `완료한 개수: ${completedCount}개`
            }
          </span>
          <div className="flex space-x-4">
            {/* (추가) 연속 정타 단어 개수 표시 UI */}
            {mode === 'words' && <span className="text-sm text-gray-500">연속 정타: {consecutiveCorrectWords}개</span>}
            <span className="text-sm text-gray-500">
              {typingMode === 'basic' ? '기본 모드' : '겹쳐모드'}
            </span>
            <span className="text-sm text-gray-600">
              {mode === 'words'
                ? `전체 ${totalCharacters}자 입력 (정확: ${correctCharacters}자)`
                : `현재 ${userInput.length}/${currentText.length}자`
              }
            </span>
          </div>
        </div>
      </div>

      {isCompleted && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-all duration-300">
          <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md w-full mx-4 border border-gray-200 transform transition-all duration-300 scale-100">
            <h2 className="text-3xl font-bold mb-6 text-gray-800">
              목표 달성!
            </h2>
            <div className="mb-6 space-y-4">
              <div className="text-lg text-gray-700">
                <span className="font-semibold">{wordTarget}개 단어 완료!</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xl">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="text-gray-700 font-bold text-2xl">{cpm}</div>
                  <div className="text-gray-600 text-sm">CPM</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="text-gray-700 font-bold text-2xl">{accuracy}%</div>
                  <div className="text-gray-600 text-sm">정확도</div>
                </div>
              </div>
            </div>
            <div className="flex justify-center space-x-4">
              <button
                onClick={resetPractice}
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
          className="mt-8 px-4 py-2 bg-gray-700 text-white rounded-lg font-medium transition-all duration-300 ease-out hover:bg-gray-800 transform hover:scale-105 active:scale-100"
        >
          홈으로 돌아가기
        </button>
      )}
    </div>
  );
};

export default TypingSession;