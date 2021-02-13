import { QueryConfig } from './../../_types/query-config.type';
import { LlamaStateService } from './llama-state.service';
import { TestBed, fakeAsync } from '@angular/core/testing';
import { Llama } from '../../_types/llama.type';
import { LlamaRemoteService } from '../llama-remote/llama-remote.service';
import { Spy, createSpyFromClass } from 'jasmine-auto-spies';
import { appRoutesNames } from '../../app.routes.names';
import { RouterAdapterService } from '../adapters/router-adapter/router-adapter.service';
import { ObserverSpy } from '@hirez_io/observer-spy';
describe('LlamaStateService', () => {
  let serviceUnderTest: LlamaStateService;
  let llamaRemoteServiceSpy: Spy<LlamaRemoteService>;
  let routerAdapterServiceSpy: Spy<RouterAdapterService>;
  let fakeLlamas: Llama[];
  let actualResult: any;

  Given(() => {
    TestBed.configureTestingModule({
      providers: [
        LlamaStateService,
        { provide: LlamaRemoteService, useValue: createSpyFromClass(LlamaRemoteService) },
        {
          provide: RouterAdapterService,
          useValue: createSpyFromClass(RouterAdapterService)
        }
      ]
    });

    serviceUnderTest = TestBed.inject(LlamaStateService);
    llamaRemoteServiceSpy = TestBed.inject<any>(LlamaRemoteService);
    routerAdapterServiceSpy = TestBed.inject<any>(RouterAdapterService);

    fakeLlamas = undefined;
    actualResult = undefined;
  });

  function setupAndEmitUserLlamaWithId(userllamaId: string) {
    const fakeUserLlama = createDefaultFakeLlama();
    fakeUserLlama.id = userllamaId;
    serviceUnderTest['userLlamaSubject'].next(fakeUserLlama);
  }

  describe('METHOD: getFeaturedLlamas$', () => {
    let expectedQueryConfig: QueryConfig;
    let observerSpy: ObserverSpy<Llama[]>;
    expectedQueryConfig = {
      filters: {
        featured: true
      }
    };

    describe('GIVEN llamas return successfully When subscribing & trigger mutation once then receive 2 llamas ', () => {
      Given(() => {
        observerSpy = new ObserverSpy();
        llamaRemoteServiceSpy.getMany.and.nextWith();
      });
      When(() => {
        const sub = serviceUnderTest.getFeaturedLlamas$().subscribe(observerSpy);
        serviceUnderTest['mutationSubject'].next();
        sub.unsubscribe();
      });
      Then(() => {
        expect(observerSpy.getValuesLength()).toBe(2);
      });
    });

    describe('given llamas loaded successfully from server, when subscribing', () => {
      Given(() => {
        fakeLlamas = [{ id: 'FAKE ID', name: 'FAKE NAME', imageFileName: 'FAKE IMAGE' }];
        llamaRemoteServiceSpy.getMany
          .mustBeCalledWith(expectedQueryConfig)
          .nextOneTimeWith(fakeLlamas);
      });

      When(() => {
        serviceUnderTest.getFeaturedLlamas$().subscribe(value => (actualResult = value));
      });

      Then(() => {
        expect(actualResult).toEqual(fakeLlamas);
      });
    });

    describe('given loaded llama is poked by user, when subscribing', () => {
      const fakeUserLlamaId = 'fakeid';
      Given(() => {
        const fakePokedLlama = createDefaultFakeLlama();
        fakePokedLlama.pokedByTheseLlamas = [fakeUserLlamaId];
        fakeLlamas = [fakePokedLlama];
        setupAndEmitUserLlamaWithId(fakeUserLlamaId);
        llamaRemoteServiceSpy.getMany
          .mustBeCalledWith(expectedQueryConfig)
          .nextOneTimeWith(fakeLlamas);
      });

      When(() => {
        serviceUnderTest.getFeaturedLlamas$().subscribe(value => (actualResult = value));
      });

      Then(() => {
        const expectedPokedLlama: Llama = actualResult[0];
        expect(expectedPokedLlama.isPoked).toBe(true);
      });
    });
  });

  describe('METHOD: pokeLlama', () => {
    let fakeUserLlamaId: string;
    let fakeLlama: Llama;

    When(
      fakeAsync(() => {
        serviceUnderTest.pokeLlama(fakeLlama);
      })
    );

    describe('GIVEN user llama exists', () => {
      let mutationNextSpy: jasmine.Spy;
      Given(() => {
        mutationNextSpy = jasmine.createSpy('mutationNextSpy');
        serviceUnderTest['mutationSubject'].next = mutationNextSpy;
        fakeUserLlamaId = 'FAKE USER LLAMA ID';
        setupAndEmitUserLlamaWithId(fakeUserLlamaId);
      });

      describe('GIVEN llama with a empty pokedBy list THEN add user llama to the list', () => {
        Given(() => {
          fakeLlama = createDefaultFakeLlama();
        });

        Then(() => {
          const expectedChanges: Partial<Llama> = {
            pokedByTheseLlamas: [fakeUserLlamaId]
          };
          expect(llamaRemoteServiceSpy.update).toHaveBeenCalledWith(
            fakeLlama.id,
            expectedChanges
          );

          expect(mutationNextSpy).toHaveBeenCalled();
        });
      });

      describe('GIVEN llama with a filled pokedBy list THEN add user llama to the list', () => {
        Given(() => {
          fakeLlama = createDefaultFakeLlama();
          fakeLlama.pokedByTheseLlamas = ['ANOTHER FAKE ID'];
        });

        Then(() => {
          const expectedChanges: Partial<Llama> = {
            pokedByTheseLlamas: ['ANOTHER FAKE ID', fakeUserLlamaId]
          };
          expect(llamaRemoteServiceSpy.update).toHaveBeenCalledWith(
            fakeLlama.id,
            expectedChanges
          );
          expect(mutationNextSpy).toHaveBeenCalled();
        });
      });
    });

    describe('GIVEN user llama is empty THEN redirect to login', () => {
      Then(() => {
        expect(routerAdapterServiceSpy.goToUrl).toHaveBeenCalledWith(
          `/${appRoutesNames.LOGIN}`
        );
      });
    });
  });

  describe('METHOD: loadUserLlama', () => {
    let fakeUserId: number;
    let expectedReturnedUserLlama: Llama;
    Given(() => {
      fakeUserId = 33333333;

      expectedReturnedUserLlama = createDefaultFakeLlama();
      expectedReturnedUserLlama.userId = fakeUserId;

      llamaRemoteServiceSpy.getByUserId
        .mustBeCalledWith(fakeUserId)
        .nextOneTimeWith(expectedReturnedUserLlama);

      serviceUnderTest.getUserLlama$().subscribe(result => (actualResult = result));
    });

    When(
      fakeAsync(() => {
        serviceUnderTest.loadUserLlama(fakeUserId);
      })
    );

    Then(() => {
      expect(actualResult).toEqual(expectedReturnedUserLlama);
    });
  });
});

function createDefaultFakeLlama(): Llama {
  return { id: 'FAKE ID', name: 'FAKE NAME', imageFileName: 'FAKE IMAGE' };
}
