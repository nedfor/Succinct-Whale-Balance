class Game {
    constructor() {
        // DOM elementlerini al
        this.loginScreen = document.getElementById('login-screen');
        this.gameScreen = document.getElementById('game-screen');
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Timer ID'leri
        this.gameTimer = null;
        this.countdownTimer = null;

        // Tuş durumları
        this.keys = {
            ArrowLeft: false,
            ArrowRight: false
        };

        // Oyun durumu
        this.gameState = {
            username: '',
            usdtBalance: 300000,
            btcBalance: 0,
            ethBalance: 0,
            btcPrice: 10000, // BTC başlangıç fiyatı
            ethPrice: 1000,  // ETH başlangıç fiyatı
            gameTime: 120,   // 2 dakika = 120 saniye
            isPlaying: false,
            speed: 5,
            lastBtcTrend: 0, // BTC trend takibi için
            lastEthTrend: 0, // ETH trend takibi için
            btcPositiveTrend: 0, // BTC yükseliş trendi sayacı
            ethNegativeTrend: 0  // ETH düşüş trendi sayacı
        };

        // Yengeç özellikleri
        this.crab = {
            x: 0,
            y: 0,
            width: 90,
            height: 90,
            speed: 0,
            maxSpeed: 25,
            acceleration: 2.5,
            deceleration: 1.5
        };

        // Düşen öğeler
        this.fallingItems = [];
        
        // Kazanç göstergeleri
        this.floatingTexts = [];

        // Görselleri yükle
        this.images = {};
        this.loadImages();

        // Oyun istatistikleri
        this.stats = {
            btcCollected: 0,
            btcValue: 0,
            ethCollected: 0,
            ethValue: 0,
            airdropCount: 0,
            airdropValue: 0,
            scamCount: 0,
            scamValue: 0,
            hackerCount: 0,
            hackerValue: 0
        };

        // Ses sistemi
        this.backgroundMusic = new Audio('assets/sounds/background.mp3');
        this.backgroundMusic.loop = true;
        this.backgroundMusic.volume = 0.5;

        // Event listener'ları ekle
        this.setupEventListeners();
    }

    loadImages() {
        const imageFiles = {
            background: 'assets/background.png',
            crab: 'assets/crabpixel.png',
            btc: 'assets/btcpixel.png',
            eth: 'assets/ethpixel.png',
            hacker: 'assets/hacker.png',
            scam: 'assets/scam.png',
            airdrop: 'assets/airdrop.png'
        };

        for (const [key, src] of Object.entries(imageFiles)) {
            const img = new Image();
            img.src = src;
            img.onload = () => console.log(`Loaded: ${src}`);
            img.onerror = () => console.error(`Failed to load: ${src}`);
            this.images[key] = img;
        }
    }

    setupEventListeners() {
        // How to Play popup
        const howToPlayBtn = document.getElementById('how-to-play-btn');
        const popup = document.getElementById('how-to-play-popup');
        const closePopup = document.querySelector('.close-popup');

        howToPlayBtn.addEventListener('click', () => {
            popup.classList.add('active');
        });

        closePopup.addEventListener('click', () => {
            popup.classList.remove('active');
        });

        // Close popup when clicking outside
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                popup.classList.remove('active');
            }
        });

        // Start game button
        document.getElementById('start-game').addEventListener('click', () => {
            const username = document.getElementById('username').value.trim();
            if (username) {
                this.startGame(username);
            }
        });

        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                this.keys[e.key] = true;
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                this.keys[e.key] = false;
            }
        });

        // Sell buttons
        document.getElementById('sell-btc').addEventListener('click', () => this.sellBTC());
        document.getElementById('sell-eth').addEventListener('click', () => this.sellETH());

        // Window resize
        window.addEventListener('resize', () => this.setupCanvas());
    }

    startGame(username) {
        // Set username
        this.gameState.username = username;
        document.getElementById('current-username').textContent = username;

        // Hide login screen, show game screen
        this.loginScreen.style.display = 'none';
        this.gameScreen.style.display = 'flex';

        // Setup canvas
        this.setupCanvas();

        // Müziği başlat
        this.playBackgroundMusic();

        // Start game loop
        this.gameState.isPlaying = true;
        this.gameLoop();
        this.startTimer();
        this.startItemSpawner();
    }

    setupCanvas() {
        const parent = this.canvas.parentElement;
        const rect = parent.getBoundingClientRect();
        
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        
        // Reset crab position
        this.crab.x = (this.canvas.width - this.crab.width) / 2;
        this.crab.y = this.canvas.height - this.crab.height - 20;
    }

    gameLoop() {
        if (!this.gameState.isPlaying) return;
        
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        // Yengeç hareketini güncelle
        if (this.gameState.isPlaying) {
            // Hızlanma ve yavaşlama mantığı
            if (this.keys.ArrowLeft) {
                this.crab.speed = Math.max(this.crab.speed - this.crab.acceleration, -this.crab.maxSpeed);
            } else if (this.keys.ArrowRight) {
                this.crab.speed = Math.min(this.crab.speed + this.crab.acceleration, this.crab.maxSpeed);
            } else {
                // Tuş basılı değilse yavaşla
                if (this.crab.speed > 0) {
                    this.crab.speed = Math.max(0, this.crab.speed - this.crab.deceleration);
                } else if (this.crab.speed < 0) {
                    this.crab.speed = Math.min(0, this.crab.speed + this.crab.deceleration);
                }
            }

            // Yengeci hareket ettir
            const newX = this.crab.x + this.crab.speed;
            if (newX >= 0 && newX <= this.canvas.width - this.crab.width) {
                this.crab.x = newX;
            } else {
                // Duvara çarpınca dur
                this.crab.speed = 0;
            }
        }

        // Update falling items
        this.fallingItems.forEach((item, index) => {
            item.y += this.gameState.speed;
            
            if (this.checkCollision(item)) {
                this.handleCollision(item);
                this.fallingItems.splice(index, 1);
            } else if (item.y > this.canvas.height) {
                this.fallingItems.splice(index, 1);
            }
        });

        // Fiyat güncellemesi
        if (Math.random() < 0.02) { // Her frame'de %2 şans
            this.updatePrices();
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw crab
        if (this.images.crab?.complete) {
            this.ctx.drawImage(this.images.crab, this.crab.x, this.crab.y, this.crab.width, this.crab.height);
        }

        // Draw falling items
        this.fallingItems.forEach(item => {
            if (this.images[item.type]?.complete) {
                this.ctx.drawImage(this.images[item.type], item.x, item.y, item.width, item.height);
            }
        });

        // Draw floating texts
        this.floatingTexts = this.floatingTexts.filter(text => {
            text.life -= 1;
            text.y -= 2;
            
            this.ctx.font = 'bold 20px Arial';
            this.ctx.fillStyle = text.amount > 0 ? '#00ff00' : '#ff0000';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(text.amount > 0 ? `+${text.amount}` : text.amount, text.x, text.y);
            
            return text.life > 0;
        });
    }

    startTimer() {
        // Önceki timer varsa temizle
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
        }

        this.gameTimer = setInterval(() => {
            if (this.gameState.isPlaying) {
                if (this.gameState.gameTime > 0) {
                    this.gameState.gameTime--;
                    const minutes = Math.floor(this.gameState.gameTime / 60);
                    const seconds = this.gameState.gameTime % 60;
                    document.getElementById('game-time').textContent = 
                        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                } else {
                    // Süre bittiğinde
                    this.gameState.isPlaying = false;
                    this.showGameOver();
                    
                    // Timer'ı temizle
                    clearInterval(this.gameTimer);
                    this.gameTimer = null;

                    // Oyunu sıfırla
                    this.gameState.gameTime = 120;
                    this.gameState.usdtBalance = 300000;
                    this.gameState.btcBalance = 0;
                    this.gameState.ethBalance = 0;
                    this.fallingItems = [];
                    this.floatingTexts = [];
                    this.updateUI();
                }
            }
        }, 1000);
    }

    startItemSpawner() {
        let spawnInterval = 1000; // Başlangıç spawn hızı
        
        const spawn = () => {
            if (this.gameState.isPlaying) {
                // 1 dakika sonra spawn hızını artır
                if (this.gameState.gameTime <= 60) {
                    spawnInterval = 500; // Spawn hızını 2 katına çıkar
                }
                
                const types = ['btc', 'eth', 'scam', 'hacker', 'airdrop'];
                const type = types[Math.floor(Math.random() * types.length)];
                
                this.fallingItems.push({
                    type,
                    x: Math.random() * (this.canvas.width - 45),
                    y: -45,
                    width: 45,
                    height: 45
                });
                
                // Bir sonraki spawn için zamanlayıcı ayarla
                setTimeout(spawn, spawnInterval);
            }
        };
        
        // İlk spawn'ı başlat
        spawn();
    }

    checkCollision(item) {
        return this.crab.x < item.x + item.width &&
               this.crab.x + this.crab.width > item.x &&
               this.crab.y < item.y + item.height &&
               this.crab.y + this.crab.height > item.y;
    }

    handleCollision(item) {
        let amount = 0;
        
        switch(item.type) {
            case 'btc':
                amount = -this.gameState.btcPrice;
                this.gameState.btcBalance++;
                this.gameState.usdtBalance += amount;
                this.stats.btcCollected++;
                this.stats.btcValue += -amount;
                break;
            case 'eth':
                amount = -this.gameState.ethPrice;
                this.gameState.ethBalance++;
                this.gameState.usdtBalance += amount;
                this.stats.ethCollected++;
                this.stats.ethValue += -amount;
                break;
            case 'scam':
                amount = -(Math.floor(Math.random() * 9500) + 500);
                this.gameState.usdtBalance += amount;
                this.stats.scamCount++;
                this.stats.scamValue += -amount;
                break;
            case 'hacker':
                amount = -Math.floor(this.gameState.usdtBalance * 0.1);
                this.gameState.usdtBalance *= 0.9;
                this.stats.hackerCount++;
                this.stats.hackerValue += -amount;
                break;
            case 'airdrop':
                const amounts = [300, 500, 2000, 10000];
                amount = amounts[Math.floor(Math.random() * amounts.length)];
                this.gameState.usdtBalance += amount;
                this.stats.airdropCount++;
                this.stats.airdropValue += amount;
                break;
        }

        // Kazanç/kayıp göstergesini ekle
        this.floatingTexts.push({
            x: item.x + item.width / 2,
            y: item.y,
            amount: amount,
            life: 50
        });

        this.updateUI();
    }

    updateUI() {
        document.getElementById('usdt-balance').textContent = Math.floor(this.gameState.usdtBalance).toLocaleString();
        document.getElementById('btc-balance').textContent = this.gameState.btcBalance.toLocaleString();
        document.getElementById('eth-balance').textContent = this.gameState.ethBalance.toLocaleString();
        document.getElementById('btc-price').textContent = Math.floor(this.gameState.btcPrice).toLocaleString();
        document.getElementById('eth-price').textContent = Math.floor(this.gameState.ethPrice).toLocaleString();
        document.getElementById('portfolio-value').textContent = Math.floor(
            this.gameState.usdtBalance +
            this.gameState.btcBalance * this.gameState.btcPrice +
            this.gameState.ethBalance * this.gameState.ethPrice
        ).toLocaleString();
    }

    sellBTC() {
        if (this.gameState.btcBalance > 0) {
            this.gameState.usdtBalance += this.gameState.btcBalance * this.gameState.btcPrice;
            this.gameState.btcBalance = 0;
            this.updateUI();
        }
    }

    sellETH() {
        if (this.gameState.ethBalance > 0) {
            this.gameState.usdtBalance += this.gameState.ethBalance * this.gameState.ethPrice;
            this.gameState.ethBalance = 0;
            this.updateUI();
        }
    }

    showGameOver() {
        // Müziği durdur
        this.backgroundMusic.pause();
        this.backgroundMusic.currentTime = 0;

        const gameOverPopup = document.getElementById('game-over-popup');
        
        // İstatistikleri güncelle
        document.getElementById('final-btc-amount').textContent = this.stats.btcCollected;
        document.getElementById('final-btc-value').textContent = this.stats.btcValue.toLocaleString();
        
        document.getElementById('final-eth-amount').textContent = this.stats.ethCollected;
        document.getElementById('final-eth-value').textContent = this.stats.ethValue.toLocaleString();
        
        document.getElementById('final-airdrop-count').textContent = this.stats.airdropCount;
        document.getElementById('final-airdrop-value').textContent = this.stats.airdropValue.toLocaleString();
        
        document.getElementById('final-scam-count').textContent = this.stats.scamCount;
        document.getElementById('final-scam-value').textContent = this.stats.scamValue.toLocaleString();
        
        document.getElementById('final-hacker-count').textContent = this.stats.hackerCount;
        document.getElementById('final-hacker-value').textContent = this.stats.hackerValue.toLocaleString();

        // Final portfolio değerini hesapla
        const finalPortfolio = Math.floor(
            this.gameState.usdtBalance +
            this.gameState.btcBalance * this.gameState.btcPrice +
            this.gameState.ethBalance * this.gameState.ethPrice
        );
        
        // Trading profit (sadece BTC ve ETH işlemlerinden)
        const tradingProfit = this.stats.btcValue + this.stats.ethValue;
        document.getElementById('trading-profit').textContent = (tradingProfit >= 0 ? '+' : '') + tradingProfit.toLocaleString();
        document.getElementById('trading-profit').style.color = tradingProfit >= 0 ? '#00ff00' : '#ff0000';
        
        // Net profit (başlangıç bakiyesine göre)
        const netProfit = finalPortfolio - 300000;
        document.getElementById('net-profit').textContent = (netProfit >= 0 ? '+' : '') + netProfit.toLocaleString();
        document.getElementById('net-profit').style.color = netProfit >= 0 ? '#00ff00' : '#ff0000';
        
        // Final portfolio
        document.getElementById('final-portfolio').textContent = finalPortfolio.toLocaleString();

        // Popup'ı göster
        gameOverPopup.classList.add('active');

        // Play Again butonunu ayarla
        const playAgainBtn = document.getElementById('play-again');
        playAgainBtn.onclick = () => {
            gameOverPopup.classList.remove('active');
            this.startCountdown();
        };
    }

    startCountdown() {
        // Önceki geri sayım varsa temizle
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
        }

        // Geri sayım için canvas'ı temizle
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        let count = 3;
        
        // İlk sayıyı hemen göster
        this.drawCountdownNumber(count);
        
        // Her saniye bir sayı azalt
        this.countdownTimer = setInterval(() => {
            count--;
            
            if (count > 0) {
                // Sayıyı göster
                this.drawCountdownNumber(count);
            } else {
                // Geri sayım bitti
                clearInterval(this.countdownTimer);
                this.countdownTimer = null;
                this.resetGame();
                this.gameState.isPlaying = true;
                this.gameLoop();
                this.startTimer();
                this.startItemSpawner();
            }
        }, 1000);
    }

    drawCountdownNumber(number) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#FF69B4';
        this.ctx.font = 'bold 100px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(number.toString(), this.canvas.width / 2, this.canvas.height / 2);
    }

    resetGame() {
        // Müziği yeniden başlat
        this.backgroundMusic.currentTime = 0;
        this.playBackgroundMusic();

        // Oyun değerlerini sıfırla
        this.gameState.gameTime = 120;
        this.gameState.usdtBalance = 300000;
        this.gameState.btcBalance = 0;
        this.gameState.ethBalance = 0;
        this.gameState.btcPrice = 10000; // BTC başlangıç fiyatı
        this.gameState.ethPrice = 1000;  // ETH başlangıç fiyatı
        this.gameState.lastBtcTrend = 0;
        this.gameState.lastEthTrend = 0;
        this.gameState.btcPositiveTrend = 0;
        this.gameState.ethNegativeTrend = 0;
        this.fallingItems = [];
        this.floatingTexts = [];
        
        // İstatistikleri sıfırla
        this.stats = {
            btcCollected: 0,
            btcValue: 0,
            ethCollected: 0,
            ethValue: 0,
            airdropCount: 0,
            airdropValue: 0,
            scamCount: 0,
            scamValue: 0,
            hackerCount: 0,
            hackerValue: 0
        };
        
        // UI'ı güncelle
        this.updateUI();
    }

    updatePrices() {
        // BTC Fiyat Güncellemesi
        const btcMoveType = Math.random();
        
        if (btcMoveType < 0.5) { // %50 normal hareket
            const change = (Math.random() * 0.04) - 0.02; // ±%2
            this.gameState.btcPrice *= (1 + change);
            
            // Pozitif trend takibi
            if (change > 0) {
                this.gameState.btcPositiveTrend++;
            } else {
                this.gameState.btcPositiveTrend = 0;
            }
            
            // Pozitif trend devam ederse yükseliş şansı artar
            if (this.gameState.btcPositiveTrend > 3) {
                this.gameState.btcPrice *= (1 + Math.random() * 0.03); // Ek %0-3 artış
            }
        } 
        else if (btcMoveType < 0.8) { // %30 yükseliş eğilimi
            const increase = Math.random() * 0.08 + 0.02; // %2-%10 yükseliş
            this.gameState.btcPrice *= (1 + increase);
            this.gameState.btcPositiveTrend++;
        }
        else { // %20 düşüş eğilimi
            const decrease = Math.random() * 0.06 + 0.01; // %1-%7 düşüş
            this.gameState.btcPrice *= (1 - decrease);
            this.gameState.btcPositiveTrend = 0;
        }

        // BTC fiyat sınırları
        this.gameState.btcPrice = Math.max(Math.min(this.gameState.btcPrice, 20000), 8000);

        // ETH Fiyat Güncellemesi
        const ethMoveType = Math.random();
        
        if (ethMoveType < 0.5) { // %50 normal hareket
            const change = (Math.random() * 0.06) - 0.03; // ±%3
            this.gameState.ethPrice *= (1 + change);
            
            // Negatif trend takibi
            if (change < 0) {
                this.gameState.ethNegativeTrend++;
            } else {
                this.gameState.ethNegativeTrend = 0;
            }
            
            // Negatif trend devam ederse düşüş şansı artar
            if (this.gameState.ethNegativeTrend > 2) {
                this.gameState.ethPrice *= (1 - Math.random() * 0.04); // Ek %0-4 düşüş
            }
        }
        else if (ethMoveType < 0.7) { // %20 yükseliş eğilimi
            const increase = Math.random() * 0.05 + 0.01; // %1-%6 yükseliş
            this.gameState.ethPrice *= (1 + increase);
            this.gameState.ethNegativeTrend = 0;
        }
        else { // %30 düşüş eğilimi
            const decrease = Math.random() * 0.08 + 0.02; // %2-%10 düşüş
            this.gameState.ethPrice *= (1 - decrease);
            this.gameState.ethNegativeTrend++;
        }

        // ETH fiyat sınırları
        this.gameState.ethPrice = Math.max(Math.min(this.gameState.ethPrice, 2000), 800);

        this.updateUI();
    }

    playBackgroundMusic() {
        // Müziği başlatmayı dene
        const playAttempt = () => {
            this.backgroundMusic.play()
                .then(() => {
                    console.log('Müzik başladı');
                    document.removeEventListener('click', playAttempt);
                })
                .catch(error => {
                    console.error('Müzik başlatılamadı, tekrar deneniyor...', error);
                });
        };

        // Hemen çalmayı dene
        playAttempt();
        
        // Kullanıcı etkileşimi ile tekrar dene
        document.addEventListener('click', playAttempt);
    }
}

// Oyunu başlat
window.addEventListener('load', () => {
    new Game();
}); 