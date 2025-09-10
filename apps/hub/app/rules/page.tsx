'use client';

import { useEffect } from "react";

export default function RulesPage() {
  useEffect(() => {
    document.title = 'ルール | Five Cucumber';
  }, []);

  return (
    <main className="min-h-screen w-full pt-20">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-center">ルール</h1>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">5本のきゅうり</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">基本ルール</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>トリックテイキングゲームです</li>
                  <li>最終トリックで最大カードを出したプレイヤーが「きゅうり」を受け取ります</li>
                  <li>きゅうりを5本集めると敗北です</li>
                  <li>最初のプレイヤーがスートを決め、他のプレイヤーは同じスートを出す必要があります</li>
                  <li>同じスートがない場合は任意のカードを出せます</li>
                </ol>
              </div>

              <div>
                <h3 className="font-semibold mb-2">カードの価値</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>カード2-5: きゅうり1本</li>
                  <li>カード6-9: きゅうり2本</li>
                  <li>カード10-11: きゅうり3本</li>
                  <li>カード12-14: きゅうり4本</li>
                  <li>カード15: きゅうり5本</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">特殊ルール</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>カード「1」が出された場合、きゅうりの価値が2倍になります</li>
                  <li>同じ数字のカードが出された場合、後出しのプレイヤーが勝ちます</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
