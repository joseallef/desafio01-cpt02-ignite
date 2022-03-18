import { createContext, useRef, useEffect, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const prevCarRef = useRef<Product[]>();

  useEffect(() => {
    prevCarRef.current = cart;
  })

  const cartPreviousValue = prevCarRef.current ?? cart;

  useEffect(() => {
    if (cartPreviousValue !== cart) {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    }
  }, [cart, cartPreviousValue]);

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productExists = updatedCart.find(product => product.id === productId);

      const productStock = await api.get<Stock>(`stock/${productId}`);
      const stockAmount = productStock.data.amount;
      const currentAmount = productExists ? productExists.amount : 0;
      const amount = currentAmount + 1;

      // const requestProduct = await api.get('products')
      //   .then(products => products.data);

      // const result = requestProduct.reduce((acc: ProductListProps, product: ProductListProps) => {
      //   if (product.id === productId) {
      //     acc.id = product.id;
      //     acc.image = product.image;
      //     acc.price = product.price;
      //     acc.title = product.title;
      //     acc.amount = 1;
      //   }
      //   return acc;
      // }, {
      //   id: 0,
      //   image: '',
      //   price: 0,
      //   title: '',
      //   amount: 0,
      // })

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productExists) {
        productExists.amount = amount;
      } else {
        const requestProduct = await api.get(`products/${productId}`);
        const newProduct = {
          ...requestProduct.data,
          amount: 1
        }
        // setCart([...cart, result]);
        updatedCart.push(newProduct);
      }
      setCart(updatedCart);
      toast.success('Produto adicionado ao carrinho');
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const valueUpdated = [...cart];
      const productExists = valueUpdated.findIndex(product => product.id === productId);
      if (productExists >= 0) {
        valueUpdated.splice(productExists, 1);
        setCart(valueUpdated);
        // localStorage.setItem('@RocketShoes:cart', JSON.stringify(valueUpdated));
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const stock = await api.get<Stock>(`/stock/${productId}`);

      const stockAmount = stock.data.amount;
      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const valueUpdated = [...cart];
      const productExists = valueUpdated.find(product => product.id === productId);

      if (productExists) {
        productExists.amount = amount;
        setCart(valueUpdated)
        // localStorage.setItem('@RocketShoes:cart', JSON.stringify(valueUpdated));
      } else {
        throw Error();
      }

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
