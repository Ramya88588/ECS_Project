# Firebase/Firestore Connection Troubleshooting

## WebChannelConnection RPC Errors - How to Fix

The WebChannelConnection RPC errors typically occur when Firestore is imported but not properly configured. Here's how to resolve this issue:

### Option 1: Remove Firebase (Current Implementation Uses LocalStorage)

Your current implementation uses localStorage for data persistence. If you're seeing Firebase errors but not actually using Firebase:

1. **Check for any Firebase imports** in your codebase:
   - Look for imports like `import { initializeApp } from 'firebase/app'`
   - Search for `firebase` or `firestore` in your code
   - Remove any Firebase initialization code

2. **Clear browser cache and localStorage**:
   ```javascript
   // In browser console:
   localStorage.clear();
   location.reload();
   ```

### Option 2: Properly Integrate Firebase (If You Want to Use It)

If you want to actually use Firebase/Firestore instead of localStorage:

#### Step 1: Create Firebase Configuration File

Create `/config/firebase.ts`:

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
```

#### Step 2: Update AuthProvider to Use Firebase Auth

Replace the mock authentication in `AuthProvider.tsx` with actual Firebase authentication:

```typescript
import { auth } from '../../config/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';

// Update login function
const login = async (email: string, password: string) => {
  setLoading(true);
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    // User state will be updated via onAuthStateChanged
  } catch (error) {
    throw new Error('Login failed');
  } finally {
    setLoading(false);
  }
};

// Update signup function
const signup = async (email: string, password: string, name: string) => {
  setLoading(true);
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // Update user profile with name
    // User state will be updated via onAuthStateChanged
  } catch (error) {
    throw new Error('Signup failed');
  } finally {
    setLoading(false);
  }
};

// Add auth state listener in useEffect
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
    if (firebaseUser) {
      setUser({
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || ''
      });
    } else {
      setUser(null);
    }
    setLoading(false);
  });

  return () => unsubscribe();
}, []);
```

#### Step 3: Update DataService to Use Firestore

Replace localStorage operations in `dataService.ts` with Firestore operations:

```typescript
import { db } from '../config/firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  serverTimestamp 
} from 'firebase/firestore';

// Example: Get medicine boxes
async getMedicineBoxes(userId: string): Promise<MedicineBox[]> {
  const boxesRef = collection(db, 'medicineBoxes');
  const q = query(boxesRef, where('userId', '==', userId));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
    updatedAt: doc.data().updatedAt?.toDate(),
    lastSyncAt: doc.data().lastSyncAt?.toDate(),
  })) as MedicineBox[];
}
```

### Option 3: Quick Fix (Recommended for Now)

Since your app currently uses localStorage and works fine, the easiest solution is:

1. **Ensure no Firebase imports exist** in your codebase
2. **Check browser console** for the exact error message
3. **If you have Firebase SDK loaded**, remove it from your HTML or dependencies
4. **Clear browser cache** and reload

### Current Status

Your application is currently using:
- ✅ LocalStorage for data persistence
- ✅ Mock authentication
- ❌ NO Firebase/Firestore integration

The WebChannelConnection errors suggest Firebase is being loaded somewhere but not used. Search your codebase for any Firebase imports or CDN links and remove them if you're not planning to use Firebase.

## Need Help?

If the errors persist:
1. Share the exact console error message
2. Check your `package.json` for any Firebase dependencies
3. Look for any `<script>` tags loading Firebase CDN in your HTML
