export const WORDS = 'cat,dog,house,tree,car,sun,moon,star,pizza,banana,apple,guitar,bicycle,rocket,castle,dragon,robot,flower,mountain,river,bridge,clock,umbrella,airplane,ship,train,fish,bird,butterfly,snowman,cake,ice cream,phone,computer,camera,book,key,crown,ghost,pirate,elephant,giraffe,monkey,penguin,spider,turtle,volcano,rainbow,lightning,balloon,candle,scissors,glasses,hat,shoe,boat,tractor,coconut,mango,temple,kite,cricket bat,lighthouse,tent,cloud,pencil'.split(',');
export const COLORS = ['#000000', '#ffffff', '#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa', '#6d4c41', '#ec407a'];
export const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
export const mask = (w: string, rev: number[]) =>
  w.split('').map((c, i) => (c === ' ' ? ' ' : rev.includes(i) ? c : '_')).join(' ');
