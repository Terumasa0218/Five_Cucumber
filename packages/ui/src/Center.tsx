import React from 'react';
import './theme.css';

export interface CenterProps {
  fieldCard?: {
    number: number;
    cucumbers: number;
  } | null;
  graveyardCards?: Array<{
    number: number;
    cucumbers: number;
  }>;
  className?: string;
}

export const Center: React.FC<CenterProps> = ({
  fieldCard,
  graveyardCards = [],
  className = ''
}) => {
  const getCucumberIcons = (count: number) => {
    return '🥒'.repeat(count);
  };

  return (
    <div className={`center-area ${className}`}>
      {/* Field Area */}
      <div className="center-area__field">
        <div className="center-area__title">場のカード</div>
        <div className="center-area__card-container">
          {fieldCard ? (
            <div className="center-area__card center-area__card--field">
              <div className="center-area__card-number">{fieldCard.number}</div>
              <div className="center-area__card-cucumbers">
                {getCucumberIcons(fieldCard.cucumbers)}
              </div>
            </div>
          ) : (
            <div className="center-area__card center-area__card--empty">
              <div className="center-area__card-number">?</div>
            </div>
          )}
        </div>
      </div>

      {/* Graveyard Area */}
      <div className="center-area__graveyard">
        <div className="center-area__title">墓地</div>
        <div className="center-area__graveyard-cards">
          {graveyardCards.map((card, index) => (
            <div key={index} className="center-area__graveyard-card">
              {card.number}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// CSS for center area styling
const centerStyles = `
.center-area {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 60px;
  position: relative;
  height: 100%;
}

.center-area__field,
.center-area__graveyard {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.2));
  border: 4px solid rgba(255, 255, 255, 0.6);
  border-radius: 25px;
  padding: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  backdrop-filter: blur(15px);
  box-shadow: 0 8px 35px rgba(0, 0, 0, 0.4);
  position: relative;
  min-width: 200px;
  min-height: 200px;
}

.center-area__field::before {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  background: linear-gradient(45deg, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0.3));
  border-radius: 25px;
  z-index: -1;
  opacity: 0.5;
}

.center-area__title {
  color: var(--text-light);
  font-weight: bold;
  font-size: 1.3em;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.4);
  margin-bottom: 5px;
}

.center-area__card-container {
  display: flex;
  justify-content: center;
  align-items: center;
}

.center-area__card {
  width: 80px;
  height: 110px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  border: 3px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(5px);
}

.center-area__card--field {
  background: linear-gradient(135deg, var(--card-blue), #2a7dd1);
  color: var(--text-light);
  border: 4px solid var(--card-yellow);
  box-shadow: 0 0 30px rgba(49, 153, 255, 0.8);
  animation: card-glow 2s infinite alternate;
}

.center-area__card--empty {
  background: linear-gradient(135deg, #999, #777);
  color: #555;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.center-area__card-number {
  font-size: 2em;
  margin-bottom: 4px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.4);
}

.center-area__card-cucumbers {
  font-size: 0.8em;
  line-height: 1.1;
  text-align: center;
}

.center-area__graveyard-cards {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  max-width: 180px;
  max-height: 120px;
  overflow-y: auto;
  justify-content: center;
}

.center-area__graveyard-card {
  width: 28px;
  height: 40px;
  background: linear-gradient(135deg, #666, #555);
  color: var(--text-light);
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8em;
  font-weight: bold;
  border: 2px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4);
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.4);
}

@keyframes card-glow {
  0% { 
    box-shadow: 0 0 30px rgba(49, 153, 255, 0.8); 
  }
  100% { 
    box-shadow: 0 0 40px rgba(49, 153, 255, 1), 0 0 60px rgba(255, 190, 59, 0.6); 
  }
}

@media (max-width: 768px) {
  .center-area {
    gap: 15px;
  }
  
  .center-area__field,
  .center-area__graveyard {
    padding: 20px;
    min-width: 150px;
    min-height: 150px;
  }
  
  .center-area__card {
    width: 60px;
    height: 85px;
  }
  
  .center-area__card-number {
    font-size: 1.5em;
  }
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = centerStyles;
  document.head.appendChild(styleSheet);
}
