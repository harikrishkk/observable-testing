import { Injectable } from '@angular/core';
import { Llama } from '../../_types/llama.type';
import { LlamaRemoteService } from '../llama-remote/llama-remote.service';
import { RouterAdapterService } from '../adapters/router-adapter/router-adapter.service';
import { appRoutesNames } from '../../app.routes.names';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import produce from 'immer';

@Injectable({
  providedIn: 'root'
})
export class LlamaStateService {
  private userLlamaSubject: BehaviorSubject<Llama> = new BehaviorSubject(null);

  constructor(
    private llamaRemoteService: LlamaRemoteService,
    private routerAdapterService: RouterAdapterService
  ) {}

  getFeaturedLlamas$(): Observable<Llama[]> {
    return this.llamaRemoteService
      .getMany({
        filters: {
          featured: true
        }
      })
      .pipe(map(llamas => this.decorateWithIsPoked(llamas)));
  }

  private decorateWithIsPoked(llamas: Llama[]): Llama[] {
    const newLlamasCopy: Llama[] = produce(llamas, llamasDraft => {
      const userLlama = this.userLlamaSubject.getValue();
      if (!userLlama) {
        return;
      }
      llamasDraft.forEach((llama: Llama) => {
        if (llama.pokedByTheseLlamas && llama.pokedByTheseLlamas.length > 0) {
          const idx = llama.pokedByTheseLlamas.indexOf(userLlama.id);
          llama.isPoked = idx !== -1;
        }
      });
    });
    return newLlamasCopy;
  }

  // TODO: Handle Errors?
  pokeLlama(llama: Llama) {
    const userLlama = this.userLlamaSubject.getValue();
    if (!userLlama) {
      this.routerAdapterService.goToUrl(`/${appRoutesNames.LOGIN}`);
      return;
    }

    const pokedByClone = llama.pokedByTheseLlamas ? [...llama.pokedByTheseLlamas] : [];
    pokedByClone.push(userLlama.id);

    this.llamaRemoteService.update(llama.id, {
      pokedByTheseLlamas: pokedByClone
    });
  }

  getUserLlama$(): Observable<Llama> {
    return this.userLlamaSubject.asObservable();
  }

  async loadUserLlama(userId: number): Promise<void> {
    const userLlama = await this.llamaRemoteService.getByUserId(userId).toPromise();
    this.userLlamaSubject.next(userLlama);
  }
}
