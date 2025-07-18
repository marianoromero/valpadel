import { db } from './firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy, onSnapshot } from 'firebase/firestore';

export interface FAQ {
    id: string;
    question: string;
    answer: string;
    order: number;
    createdAt: Date;
    updatedAt: Date;
}

export class FAQService {
    private static readonly COLLECTION_NAME = 'faqs';

    /**
     * Get all FAQs ordered by order field
     */
    static async getFAQs(): Promise<FAQ[]> {
        try {
            const q = query(
                collection(db, this.COLLECTION_NAME),
                orderBy('order', 'asc')
            );
            const snapshot = await getDocs(q);
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date(),
                updatedAt: doc.data().updatedAt?.toDate() || new Date()
            })) as FAQ[];
        } catch (error) {
            console.error('Error fetching FAQs:', error);
            return [];
        }
    }

    /**
     * Subscribe to FAQs changes in real-time
     */
    static subscribeToFAQs(callback: (faqs: FAQ[]) => void): () => void {
        const q = query(
            collection(db, this.COLLECTION_NAME),
            orderBy('order', 'asc')
        );

        return onSnapshot(q, (snapshot) => {
            const faqs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date(),
                updatedAt: doc.data().updatedAt?.toDate() || new Date()
            })) as FAQ[];
            
            callback(faqs);
        }, (error) => {
            console.error('Error in FAQ subscription:', error);
            callback([]);
        });
    }

    /**
     * Add a new FAQ
     */
    static async addFAQ(question: string, answer: string, order: number = 0): Promise<string> {
        try {
            const now = new Date();
            const docRef = await addDoc(collection(db, this.COLLECTION_NAME), {
                question,
                answer,
                order,
                createdAt: now,
                updatedAt: now
            });
            return docRef.id;
        } catch (error) {
            console.error('Error adding FAQ:', error);
            throw error;
        }
    }

    /**
     * Update an existing FAQ
     */
    static async updateFAQ(id: string, updates: Partial<Omit<FAQ, 'id' | 'createdAt'>>): Promise<void> {
        try {
            const docRef = doc(db, this.COLLECTION_NAME, id);
            await updateDoc(docRef, {
                ...updates,
                updatedAt: new Date()
            });
        } catch (error) {
            console.error('Error updating FAQ:', error);
            throw error;
        }
    }

    /**
     * Delete an FAQ
     */
    static async deleteFAQ(id: string): Promise<void> {
        try {
            const docRef = doc(db, this.COLLECTION_NAME, id);
            await deleteDoc(docRef);
        } catch (error) {
            console.error('Error deleting FAQ:', error);
            throw error;
        }
    }
}