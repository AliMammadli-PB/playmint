import json,re,shutil,zipfile,argparse,subprocess
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('source');parser.add_argument('output');args=parser.parse_args();src=Path(args.source).resolve();out=Path(args.output).resolve();out.mkdir(parents=True,exist_ok=True);root=out.parent;bundle=out/'bundle';bundle.mkdir(exist_ok=True)
assert subprocess.check_output(['git','-C',str(src),'rev-parse','HEAD'],text=True).strip()=='38094525ad727f40e3bbc7cfc91eb6dcbe042f11', 'Unexpected upstream revision'
items=[
('snake','Snake','arcade','Eat, grow and avoid your tail.','Yemleri topla, büyü ve kuyruğuna çarpma.','Yemləri topla, böyü və quyruğuna toxunma.'),
('breakout','Breakout','arcade','Bounce the ball and break every brick.','Topu sektir ve tüm tuğlaları kır.','Topu qaytar və bütün kərpicləri qır.'),
('block-drop','Block Drop','puzzle','Fit falling blocks into complete lines.','Düşen bloklarla tam sıralar oluştur.','Düşən bloklarla tam sıralar yarat.'),
('2048','2048','puzzle','Slide matching numbers to reach 2048.','Aynı sayıları birleştir ve 2048’e ulaş.','Eyni rəqəmləri birləşdir və 2048-ə çat.'),
('minesweeper','Minesweeper','puzzle','Use the clues to find every hidden mine.','İpuçlarıyla gizli mayınları bul.','İpucları ilə gizli minaları tap.'),
('memory-match','Memory Match','puzzle','Remember the cards and find matching pairs.','Kartları hatırla ve eşleşen çiftleri bul.','Kartları yadda saxla və eyni cütləri tap.'),
('sudoku','Sudoku','puzzle','Fill the grid without repeating a number.','Sayıları tekrarlamadan tabloyu tamamla.','Rəqəmləri təkrarlamadan cədvəli tamamla.'),
('water-sort','Water Sort','puzzle','Sort the liquids until each tube has one colour.','Her tüpte tek renk kalana kadar sıvıları ayır.','Hər qabda bir rəng qalana qədər mayeləri ayır.'),
('gem-match','Gem Match','puzzle','Match three gems and trigger chain reactions.','Üç taşı eşleştir ve zincirleme patlamalar yap.','Üç daşı birləşdir və zəncirvari reaksiyalar yarat.'),
('sokoban','Sokoban','puzzle','Push every crate onto its target.','Her sandığı hedefine it.','Hər qutunu hədəfinə itələ.'),
('reversi','Reversi','strategy','Outflank the computer and flip its discs.','Bilgisayarı kuşat ve taşlarını kendi rengine çevir.','Rəqibi mühasirəyə al və daşlarını öz rənginə çevir.'),
('battleship','Battleship','strategy','Place your fleet and locate the enemy ships.','Filonu yerleştir ve rakibin gemilerini bul.','Donanmanı yerləşdir və rəqibin gəmilərini tap.'),
('connect-four','Connect Four','strategy','Connect four discs before your opponent.','Rakibinden önce dört taşı sırala.','Rəqibindən əvvəl dörd daşı sırala.'),
('tic-tac-toe','Tic Tac Toe','strategy','Three in a row against the computer or a friend.','Bilgisayara veya arkadaşına karşı üç taşı sırala.','Kompüterə və ya dostuna qarşı üç daşı sırala.'),
('ant-flap','Ant Flap','casual','Tap to guide the flying ant through the gaps.','Dokunarak uçan karıncayı boşluklardan geçir.','Toxunaraq uçan qarışqanı boşluqlardan keçir.'),
('ant-jump','Ant Jump','platformer','Jump from platform to platform and climb higher.','Platformdan platforma zıpla ve daha yükseğe çık.','Platformadan platformaya tullan və yuxarı qalx.'),
('dino-run','Dino Run','platformer','Jump over cacti and duck under the birds.','Kaktüsleri aş ve kuşların altından geç.','Kaktusları aş və quşların altından keç.'),
('cross-road','Cross Road','arcade','Dodge traffic and cross the river safely.','Trafikten kaç ve nehri güvenle geç.','Maşınlardan yayın və çayı təhlükəsiz keç.'),
('star-defender','Star Defender','shooter','Dodge enemy waves and defend your starship.','Düşman dalgalarından kaç ve uzay gemini koru.','Düşmən dalğalarından yayın və kosmik gəmini qoru.'),
('fruit-slice','Fruit Slice','action','Slice the fruit, build combos and avoid bombs.','Meyveleri kes, kombo yap ve bombalardan kaç.','Meyvələri kəs, kombo yarat və bombalardan yayın.'),
('helix-drop','Helix Drop','action','Rotate the tower and drop through the gaps.','Kuleyi döndür ve boşluklardan düş.','Qülləni döndər və boşluqlardan düş.'),
('paddle-duel','Paddle Duel','sports','Beat the computer in a paddle duel.','Raket düellosunda bilgisayarı yen.','Raket duelində kompüteri məğlub et.'),
('air-hockey','Air Hockey','sports','Aim the puck and score seven goals to win.','Diski yönlendir, yedi gol at ve kazan.','Diski yönləndir, yeddi qol vur və qazan.'),
('stack-tower','Stack Tower','casual','Time each drop to build a taller tower.','Blokları zamanında bırak ve kuleni yükselt.','Blokları vaxtında burax və qülləni yüksəlt.'),
('whack-a-mole','Whack-a-Mole','arcade','Catch the moles and avoid the bombs.','Köstebekleri yakala ve bombalardan kaç.','Köstəbəkləri tut və bombalardan yayın.'),
('bubble-shooter','Bubble Shooter','arcade','Aim and match three bubbles to clear the board.','Üç balonu eşleştirerek alanı temizle.','Üç balonu birləşdirərək sahəni təmizlə.')]
assert len(items)==26
manifest=[]
for folder,title,cat,en,tr,az in items:
 d=bundle/folder;d.mkdir(exist_ok=True)
 s=(src/folder/'index.html').read_text()
 s=s.replace(', user-scalable=no','')
 s=s.replace('localStorage','PlaymintGameStorage')
 compat="<script>(function(){var memory=Object.create(null),native=null;try{native=window.localStorage}catch(e){}window.PlaymintGameStorage={getItem:function(k){try{if(native)return native.getItem(k)}catch(e){}return Object.prototype.hasOwnProperty.call(memory,k)?memory[k]:null},setItem:function(k,v){try{if(native){native.setItem(k,String(v));return}}catch(e){}memory[k]=String(v)},removeItem:function(k){try{if(native)native.removeItem(k)}catch(e){}delete memory[k]}}})();</script>"
 s=s.replace('<head>','<head>'+compat,1)
 s=re.sub(r'<a href="https://saveone.pro".*?</a>\s*<span.*?</span>', '', s)
 s=s.replace('href="../"','href="https://playmint.tr/games" target="_blank" rel="noopener"')
 (d/'index.html').write_text(s)
 manifest.append(dict(key=folder,slug='opensource-'+folder,title=title,category=cat,entry=folder+'/index.html',tagline=dict(en=en,tr=tr,az=az),source='https://github.com/mashukui/web-games/tree/38094525ad727f40e3bbc7cfc91eb6dcbe042f11/'+folder,author='mashukui',license='MIT',upstreamRevision='38094525ad727f40e3bbc7cfc91eb6dcbe042f11',mobileResponsive=True,fullscreenSupported=True,orientation='any',featured=folder in ['star-defender','air-hockey','water-sort','ant-jump','2048','breakout']))
shared=(src/'i18n.js').read_text().replace("var GC_SITE = 'https://mashukui.goatcounter.com/count';","var GC_SITE = '';")
(bundle/'i18n.js').write_text(shared)
shutil.copyfile(src/'LICENSE',bundle/'LICENSE')
(bundle/'NOTICE.txt').write_text('Original games: mashukui, MIT, copyright 2026.\nSource: https://github.com/mashukui/web-games\nRevision: 38094525ad727f40e3bbc7cfc91eb6dcbe042f11\nPlaymint hosting adaptations: upstream analytics disabled; unrelated promotional footer link removed; catalogue link updated; viewport zoom enabled; guarded score storage for opaque game sandbox.\n')
(bundle/'index.html').write_text('<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Open source games</title></head><body><h1>Open source games — mashukui</h1><p>MIT licensed; see LICENSE and NOTICE.txt.</p>'+''.join('<p><a href="'+g['entry']+'">'+g['title']+'</a></p>' for g in manifest)+'</body></html>')
(root/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
with zipfile.ZipFile(out/'collection.zip','w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(bundle.rglob('*')):
  if p.is_file():z.write(p,p.relative_to(bundle))
print('Prepared',len(manifest),'games; ZIP', (out/'collection.zip').stat().st_size,'bytes')
