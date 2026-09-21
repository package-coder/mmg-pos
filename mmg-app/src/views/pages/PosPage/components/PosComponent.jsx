import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
    Card,
    Typography,
    Grid,
    TextField,
    Button,
    Divider,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Autocomplete,
    Chip,
    CircularProgress,
    Tooltip,
    Box
} from '@mui/material';
import { MdPersonAdd, MdHistory, MdFrontHand, MdLogout, MdAdd, MdList } from 'react-icons/md';
import { BiSolidExit } from 'react-icons/bi';
import { TiHome } from 'react-icons/ti';
import Checkout from './Checkout';
import AddCustomerModal from './AddCustomerModal';
import AddDoctorModal from './AddDoctorModal';
import moment from 'moment';
import { formatTin } from 'utils/tin';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import packagelab from 'api/package';
import customer from 'api/customer';
import doctor from 'api/doctor';
import transaction from 'api/transaction';
import discount from 'api/discount';
import { FaPesoSign } from 'react-icons/fa6';
import { RiDeleteBack2Fill } from 'react-icons/ri';
import PackageContainer from './PackageContainer';
import PromoContainer from './PromoContainer';
import LabTestContainer from './LabTestContainer';

// component import
import RightDrawer from 'ui-component/drawer/rightDrawer';
import TransactionsSlideBar from './TransactionsSideBar';
import { useMediaQuery } from '@mui/system';
import { useTheme } from '@emotion/react';
import PackagesComponent from './PackagesComponent';
import DiscountComponent from './DiscountComponent';
import { useHotkeys } from 'react-hotkeys-hook';
import LabTestComponent from './LabTestComponent';
import NewTransactionDialog from './NewTransactionDialog';
import RemoveDiscountDialog from './RemoveDiscountDialog';
import HoldItems from './HoldComponent';
import ServicesPage from 'views/pages/ServicesPage';
import CashRegister from './CashRegister';
import { useAuth } from 'providers/AuthProvider';
import DailyReport from './DailyReport';
import CusCorSelect from './CusCorSelect';
import { useCashierReport } from '..';
import { useNavigate } from 'react-router-dom';
import print from 'api/print';
import { usePrinter } from 'providers/PrinterProvider';

const calculatePackagePrice = (packageItem) => {
    const packageLabTestPrice = (packageItem.labTest || []).reduce((acc, labTest) => acc + labTest.price, 0);

    let discountedPrice;
    let originalPrice = packageLabTestPrice;

    // Apply discount based on type (if applicable)
    if (packageItem.discount) {
        const discountValue = packageItem.discount.value;
        switch (packageItem.discount.type) {
            case 'percentage':
                discountedPrice = originalPrice - (originalPrice * discountValue) / 100;
                break;
            case 'fixed':
                discountedPrice = originalPrice - discountValue;
                break;
            default:
                console.error('Invalid discount type:', packageItem.discount.type);
                break;
        }
    }

    return {
        discountedPrice: discountedPrice || originalPrice, // Use discountedPrice if available, otherwise originalPrice
        originalPrice
    };
};

const PosComponent = () => {
    const { status: printerStatus, display: showCustomerDisplay } = usePrinter();

    const { control, reset, setValue } = useForm({
        defaultValues: {
            customer: null,
            requestedBy: null,
            referredBy: null
        }
    });

    const { branch } = useAuth();
    const { getDrawerBalance, isRefetching: isReportRefetching } = useCashierReport();

    const [openNewTransDialog, setNewTransDialog] = useState(false);
    const [removeDiscountDialogOpen, setRemoveDiscountDialogOpen] = useState(false);
    const [isNewTrans, setIsNewTrans] = useState(false);
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [subTotal, setSubTotal] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [checkout, setCheckout] = useState(false);
    const [ifLogout, setIfLogout] = useState(false);
    const [addCustomerModalOpen, setAddCustomerModalOpen] = useState(false);
    const [addDoctorModalOpen, setAddDoctorModalOpen] = useState(false);
    const [referredBy, setReferredBy] = useState({ id: null, name: null });
    const [requestedBy, setRequestedBy] = useState({ id: null, name: null });
    const [customerData, setCustomerData] = useState([]);
    const [referenceNumber, setReferenceNumber] = useState(null);
    const [transactionDate, setTransactionDate] = useState(moment().format('MM/DD/YYYY HH:mm:ss'));
    const [appliedDiscount, setAppliedDiscount] = useState(null);
    const [sessionItems, setSessionItems] = useState([]);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerContent, setDrawerContent] = useState();
    const [regDiscount, setRegularDiscount] = useState(0);
    const [regDiscountType, setRegularDiscountType] = useState();
    const [regDiscountName, setRegularDiscountName] = useState();
    const [regDiscountMemberType, setRegularDiscountMemberType] = useState();
    // Tracks whether the current appliedDiscount was auto-tagged from the customer's type (vs.
    // manually picked by the cashier), so switching customers can safely swap/clear it without
    // ever overriding a discount the cashier explicitly chose.
    const [isAutoAppliedDiscount, setIsAutoAppliedDiscount] = useState(false);

    // do be deleted
    const [isPackageOrPromoAdded, setIsPackageOrPromoAdded] = useState(false);
    const [discountApplied, setDiscountApplied] = useState(false);
    //

    // const { data: packages } = useQuery('packages', packagelab.GetAllPackages);
    const { data: doctorlist } = useQuery('doctors', doctor.GetAllDoctor);
    const { data: discountsData } = useQuery('discounts', discount.GetAllDiscounts);
    // Senior Citizen and PWD carry the same discount percentage, so whichever record exists is
    // used for both - no need to ask the cashier which one applies.
    const scPwdDiscount =
        discountsData?.find((item) => item.memberType === 'senior_citizen') ||
        discountsData?.find((item) => item.memberType === 'pwd');
    const soloParentDiscount = discountsData?.find((item) => item.memberType === 'solo_parent');
    const naacDiscount = discountsData?.find((item) => item.memberType === 'naac');

    // const { data: totalSales } = useQuery(
    //   ['transaction', sessionItems?._id, branch?.id],
    //   () => transaction.GetSales(sessionItems?._id, branch?.id),
    //   {
    //     enabled: !!sessionItems?._id // Only run the query if a transaction ID is set
    //   }
    // );

    const [combinedDoctorData, setCombinedDoctorData] = useState([]);
    const [selectedPackages, setSelectedPackages] = useState([]);
    const [transactionData, setTransactionData] = useState([]);
    // Deliberately separate from transactionData.id — that field is also populated by the
    // unrelated legacy "New Transaction" shell record (createTransactionMutation ->
    // /transaction/create, the old `transactions` collection) on every fresh transaction, so it
    // can't be trusted as a signal that this cart came from a restored hold. Only
    // handleRestoreTransaction sets this, and it's the only thing Checkout.jsx uses to decide
    // whether completing this cart should convert an existing v3 hold document (see
    // pos-api/app/blueprints/transaction.py: v3_create_transaction) instead of creating a new one.
    const [holdTransactionId, setHoldTransactionId] = useState(null);

    const [selectedPackagesX, setSelectedPackagesX] = useState({
        packages: [],
        promos: [],
        labtests: []
    });

    const navigate = useNavigate();

    useEffect(() => {
        const dataSession = JSON.parse(localStorage.getItem('session'));
        console.log('dataSession', dataSession);
        if (dataSession) {
            setSessionItems(dataSession);
        }
    }, []);

    const queryClient = useQueryClient();

    const createTransactionMutation = useMutation(transaction.CreateTransaction, {
        onMutate: async (newTransaction) => {
            await queryClient.cancelQueries('transactions');
            const previousTransaction = queryClient.getQueryData('transactions');

            // Check if the previous services data is empty or undefined
            if (!previousTransaction || previousTransaction.length === 0) {
                // If empty, proceed with creating the new service
                queryClient.setQueryData('transactions', [newTransaction]);
            } else {
                // If not empty, append the new service to the existing list
                queryClient.setQueryData('transactions', (old) => [...old, newTransaction]);
            }

            return { previousTransaction };
        },
        onError: (err, newTransaction, context) => {
            queryClient.setQueryData('transactions', context.previousTransaction);
            toast.error('Error creating transaction.');
        },
        onSuccess: (data) => {
            // toast.success('Lab Test created successfully.', {
            //     onClose: handleNavigation
            // });
            setTransactionData(data);
        },
        onSettled: () => {
            queryClient.invalidateQueries('transactions');
        }
    });

    const editTransactionMutation = useMutation(transaction.UpdateTransaction, {
        onMutate: async (updatedTransaction) => {
            await queryClient.cancelQueries('transactions');
            const previousTransaction = queryClient.getQueryData('transactions');
            queryClient.setQueryData('transactions', (old) =>
                old?.map((cat) => (cat._id === updatedTransaction._id ? updatedTransaction : cat))
            );
            return { previousTransaction };
        },
        onError: (err, updatedService, context) => {
            queryClient.setQueryData('transactions', context.previousTransaction);
            toast.error('Error canceling the transaction.');
        },
        onSuccess: () => {
            reset();
            setRequestedBy([]);
            setReferredBy([]);
            setCustomerData([]);
            setTransactionData([]);
            setHoldTransactionId(null);
            setSelectedPackages([]);
            setItems([]);
            setTotal(0);
            setSubTotal(0);
            setReferenceNumber(null);
            setAppliedDiscount(null);
            setIsAutoAppliedDiscount(false);
            setIsNewTrans(false);
            setIsPackageOrPromoAdded(false);
        },
        onSettled: () => {
            queryClient.invalidateQueries('transactions');
        }
    });

    useEffect(() => {
        // This effect runs whenever `customerData` changes
        console.log('Customer data has changed:', customerData);
    }, [customerData]);

    useEffect(() => {
        if (doctorlist) {
            const combinedDoctorData = doctorlist.map((doctor) => ({
                id: doctor._id,
                fullName: `${doctor.firstName} ${doctor.middleName ? doctor.middleName + ' ' : ''}${doctor.lastName}`,
                isMember: doctor?.isMember
            }));
            setCombinedDoctorData(combinedDoctorData);
        }
    }, [doctorlist]);

    useEffect(() => {
        if (requestedBy) {
            setValue('requestedBy', combinedDoctorData.find((doctor) => doctor.id === requestedBy.id) || null);
        }
    }, [requestedBy, setValue, combinedDoctorData]);

    useEffect(() => {
        if (referredBy) {
            setValue('referredBy', combinedDoctorData.find((doctor) => doctor.id === referredBy.id) || null);
        }
    }, [referredBy, setValue, combinedDoctorData]);

    useEffect(() => {
        let totalPackagePrice = { discountedPrice: 0, originalPrice: 0 };
        let totalPromoPrice = { discountedPrice: 0, originalPrice: 0 };
        let totalLabTestPrice = selectedPackagesX?.labtests?.reduce((acc, labTest) => acc + labTest.price, 0);
        let totalLabTestDiscountedPrice = totalLabTestPrice;

        // Case: Packages and promos
        if (selectedPackagesX.packages.length > 0) {
            totalPackagePrice = selectedPackagesX.packages.reduce(
                (acc, packageItem) => {
                    const packagePrices = calculatePackagePrice(packageItem);
                    return {
                        discountedPrice: acc.discountedPrice + packagePrices.discountedPrice,
                        originalPrice: acc.originalPrice + packagePrices.originalPrice
                    };
                },
                { discountedPrice: 0, originalPrice: 0 }
            );
        }

        if (selectedPackagesX.promos.length > 0) {
            totalPromoPrice = selectedPackagesX.promos.reduce(
                (acc, promoItem) => {
                    const promoPrices = calculatePackagePrice(promoItem);
                    return {
                        discountedPrice: acc.discountedPrice + promoPrices.discountedPrice,
                        originalPrice: acc.originalPrice + promoPrices.originalPrice
                    };
                },
                { discountedPrice: 0, originalPrice: 0 }
            );
        }

        // Case: Apply discount to lab tests with package discount
        if (selectedPackagesX.packages.length > 0 && selectedPackagesX.packages[0].discount) {
            const packageDiscount = selectedPackagesX.packages[0].discount;
            if (packageDiscount.type === 'percentage') {
                totalLabTestDiscountedPrice = totalLabTestPrice - totalLabTestPrice * (selectedPackagesX.packages[0].discount.value / 100);
            }
        }

        // Combine prices (packages, promos, lab tests)
        const grandPackagePrice = {
            originalPrice: totalPackagePrice.originalPrice + totalLabTestPrice,
            discountedPrice: totalPackagePrice.discountedPrice + totalLabTestDiscountedPrice
        };

        // Calculate the grand total (includes promos if any)
        const grandTotalOriginalPrice = grandPackagePrice.originalPrice + totalPromoPrice.originalPrice;
        const grandTotalDiscountedPrice = grandPackagePrice.discountedPrice + totalPromoPrice.discountedPrice;

        // Set subtotal and total
        setSubTotal(grandTotalOriginalPrice);
        setTotal(grandTotalDiscountedPrice);

        console.log('customerData', customerData);
        console.log('selectedPackagesX.packages', selectedPackagesX.packages);

        // Apply discount logic
        if (
            selectedPackagesX.packages.length > 0 &&
            selectedPackagesX.packages[0].discount &&
            customerData?.customerType === 'seniorcitizenpwd'
        ) {
            setAppliedDiscount({
                type: 'percentage',
                value: selectedPackagesX.packages[0].discount.value,
                name: selectedPackagesX.packages[0].discount.name,
                memberType: selectedPackagesX.packages[0].discount.memberType,
                totalDiscount: (totalPackagePrice.originalPrice + totalLabTestPrice) * (selectedPackagesX.packages[0].discount.value / 100)
            });
        } else if (
            selectedPackagesX.packages.length > 0 &&
            selectedPackagesX.packages[0].discount &&
            customerData?.customerType !== 'seniorcitizenpwd'
        ) {
            setAppliedDiscount({
                type: 'percentage',
                value: selectedPackagesX.packages[0].discount.value,
                name: selectedPackagesX.packages[0].discount.name,
                memberType: selectedPackagesX.packages[0].discount.memberType,
                totalDiscount: (totalPackagePrice.originalPrice + totalLabTestPrice) * (selectedPackagesX.packages[0].discount.value / 100)
            });
        } else if (regDiscount) {
            const regDiscountAmount = totalLabTestPrice ? (totalLabTestPrice * regDiscount) / 100 : totalLabTestPrice;
            setAppliedDiscount({
                type: regDiscountType,
                value: regDiscount,
                name: regDiscountName,
                memberType: regDiscountMemberType,
                totalDiscount: regDiscountAmount
            });
            // grandTotalDiscountedPrice above doesn't know about this discount (it's only applied via
            // handleSelectDiscount, not baked into calculatePackagePrice), so subtract it here too.
            setTotal(grandTotalDiscountedPrice - regDiscountAmount);
        } else if (selectedPackagesX.packages.length === 0 && selectedPackagesX.promos.length === 0) {
            setAppliedDiscount(null);
        }

        // Count total items (lab tests and packages)
        const totalPackageLabTests = selectedPackagesX.packages.reduce((acc, packageItem) => acc + (packageItem.labTest?.length || 0), 0);
        const totalPromoLabTests = selectedPackagesX.promos.reduce((acc, promoItem) => acc + (promoItem.labTest?.length || 0), 0);
        const totalLabTests = selectedPackagesX.labtests.length;

        const grandTotalItems = totalPackageLabTests + totalPromoLabTests + totalLabTests;
        setTotalItems(grandTotalItems);
    }, [selectedPackagesX]);

    const handleAddItem = async (item) => {
        console.warn('transaction-item', item);

        switch (item?.packageType) {
            case 'package':
                const packageItems = {
                    ...item,
                    _id: item?._id,
                    source: 'package',
                    labTest: (item?.labTest || []).map((test) => ({
                        qty: 1, // Ensure quantity is always 1
                        price: test.price,
                        amount: test.price * 1,
                        ...test
                    }))
                };

                setSelectedPackagesX((prev) => ({
                    ...prev,
                    packages: [...prev.packages, packageItems]
                }));

                break;
            case 'promo':
                if (selectedPackagesX.promos.length > 0) {
                    // You can show an error message here or handle it differently
                    console.error('Only one promo can be added at a time.');
                    alert('Only one promo can be added at a time.');
                    return; // Stop further execution
                }
                const promoItems = {
                    ...item,
                    _id: item?._id,
                    source: 'promo',
                    labTest: (item?.labTest || []).map((test) => ({
                        qty: 1, // Ensure quantity is always 1
                        price: test.price,
                        amount: test.price * 1,
                        ...test
                    }))
                };

                setSelectedPackagesX((prev) => ({
                    ...prev,
                    promos: [...prev.promos, promoItems]
                }));
                break;
            default:
                // Handle unexpected package types here (e.g., log an error)

                if (selectedPackagesX.labtests.some((labTest) => labTest._id === item._id)) {
                    alert(`${item.name} is already added.`);
                    return;
                }

                item = {
                    source: 'labTest',
                    qty: 1,
                    price: item?.price,
                    amount: item?.price,
                    ...item
                };

                setSelectedPackagesX((prev) => ({
                    ...prev,
                    labtests: [...prev.labtests, item]
                }));
                break;
        }

        if (['package', 'promo'].includes(item.packageType)) {
            await showCustomerDisplay('item', { ...item, price: item.totalDiscountedPrice });
        } else {
            await showCustomerDisplay('item', { ...item });
        }
    };

    console.log('selectedPackagesX', selectedPackagesX);
    // console.log('totalPackagePrice', totalPackagePrice)
    // console.log('totalPromoPrice', totalPromoPrice)
    // console.log('totalLabTestPrice', totalLabTestPrice)

    const handleRemovePackageItem = (item) => {
        console.log('remove', item);
        setSelectedPackagesX((prev) => ({
            ...prev,
            packages: prev.packages.filter((packageItem) => packageItem._id !== item._id)
        }));
        setIsPackageOrPromoAdded(false);
        setSelectedPackages([]);
    };

    const handleRemovePromoItem = (item) => {
        setSelectedPackagesX((prev) => ({
            ...prev,
            promos: prev.promos.filter((promoItem) => promoItem._id !== item._id)
        }));
        setIsPackageOrPromoAdded(false);
    };

    const handleRemoveLabTestItem = (item) => {
        setSelectedPackagesX((prev) => ({
            ...prev,
            labtests: prev.labtests.filter((labTest) => labTest._id !== item._id)
        }));

        // Check if labtests array is empty after removing the item
        if (selectedPackagesX.labtests.length === 1) {
            setRegularDiscount(0);
            setRegularDiscountName(undefined);
            setRegularDiscountMemberType(undefined);
        }
    };

    const handleClearItems = async (id, reason) => {
        const combinedDataX = [...selectedPackagesX.packages, ...selectedPackagesX.promos, ...selectedPackagesX.labtests];
        const newMapData = {
            id: id,
            customerData: customerData,
            requestedById: requestedBy.id,
            requestedByName: requestedBy.name,
            referredById: referredBy.id,
            referredByName: referredBy.name,
            transactionNumber: transactionData?.transactionNo,
            transactionDate: transactionData?.transactionDate,
            cashierId: sessionItems?._id,
            cashierName: `${sessionItems?.firstName} ${sessionItems?.lastName}`,
            branchName: branch?.name,
            branchTIN: branch?.tin,
            branchAddress: `${branch?.streetAddress} ${branch?.state}`,
            discountApplied: appliedDiscount,
            promoDiscount: selectedPackagesX.promos[0]?.discount?.value || 0,
            subTotal: subTotal,
            paymentDue: total,
            services: combinedDataX,
            status: 'Cancelled',
            reason
        };

        await editTransactionMutation.mutateAsync(newMapData);

        reset();
        setRequestedBy([]);
        setReferredBy([]);
        setCustomerData([]);
        setTransactionData([]);
        setHoldTransactionId(null);
        setSelectedPackages([]);
        setItems([]);
        setTotal(0);
        setSubTotal(0);
        setReferenceNumber(null);
        setAppliedDiscount(null);
        setIsAutoAppliedDiscount(false);
        setIsNewTrans(false);
        setIsPackageOrPromoAdded(false);
        setDiscountApplied(false);
    };

    const handleClearTransItem = async () => {
        setItems([]);
        setAppliedDiscount(null);
        setIsAutoAppliedDiscount(false);
        setIsPackageOrPromoAdded(false);
        setDiscountApplied(false);
        setSelectedPackages([]);
        setRegularDiscount(0);
        setRegularDiscountName(undefined);
        setRegularDiscountMemberType(undefined);
        setSelectedPackagesX(() => ({
            packages: [],
            promos: [],
            labtests: []
        }));

        await showCustomerDisplay('item');
    };

    const handleRestoreTransaction = (selectedTransaction) => {
        if (selectedTransaction) {
            const restoredRequestedBy = combinedDoctorData.find((doctor) => doctor.id === selectedTransaction?.requestedBy?._id);
            const restoredReferredBy = combinedDoctorData.find((doctor) => doctor.id === selectedTransaction?.referredBy?._id);

            // The saved transaction (GET /v2/transactions) nests a full `customer` record, not the
            // flat `customerData` shape CusCorSelect/setCustomerData use elsewhere — map it across.
            const customer = selectedTransaction?.customer;
            setCustomerData(
                customer
                    ? {
                          id: customer._id,
                          name: customer.name,
                          address: customer.address
                              ? `${customer.address.street} ${customer.address.barangay} ${customer.address.cityMunicipality} ${customer.address.province} ${customer.address.country}`
                              : '',
                          age: customer.age,
                          tin: formatTin(customer.tin_number),
                          contactNumber: customer.contact_number,
                          customerType: customer.customer_type
                      }
                    : []
            );

            setRequestedBy({
                id: restoredRequestedBy?.id,
                name: restoredRequestedBy?.fullName
            });

            setReferredBy({
                id: restoredReferredBy?.id,
                name: restoredReferredBy?.fullName
            });

            setTransactionData({
                id: selectedTransaction?._id,
                invoiceNumber: selectedTransaction?.invoiceNumber
            });
            // Marks this cart as "completing a held sale" so Pay converts the original hold document
            // in place instead of creating a second, disconnected completed transaction next to it.
            setHoldTransactionId(selectedTransaction?._id);

            setReferenceNumber(selectedTransaction?.invoiceNumber);

            // Rebuild the cart from the flat `transactionItems` array the backend stores — the
            // inverse of the reduce() in api/transaction.js's CreateTransactionV2. Each item that
            // belonged to a package/promo carries a `package` reference (only { id, name,
            // description, type } survive — price/discount metadata isn't preserved once saved, so a
            // restored package shows its items and their real prices but not the original discount
            // rule); items with no `package` were added individually as standalone lab tests.
            const transactionItems = selectedTransaction?.transactionItems || [];
            const packageGroups = new Map();
            const restoredLabTests = [];

            transactionItems.forEach((rawItem, index) => {
                const pkg = rawItem?.package;
                const asCartItem = {
                    _id: rawItem?._id || `${selectedTransaction?._id}-${index}`,
                    name: rawItem?.name,
                    price: rawItem?.price,
                    qty: rawItem?.quantity ?? 1,
                    amount: (rawItem?.price ?? 0) * (rawItem?.quantity ?? 1),
                    category: rawItem?.categoryId ? { id: rawItem.categoryId } : null
                };

                if (!pkg) {
                    restoredLabTests.push({ ...asCartItem, source: 'labTest' });
                    return;
                }

                if (!packageGroups.has(pkg.id)) {
                    packageGroups.set(pkg.id, {
                        _id: pkg.id,
                        name: pkg.name,
                        description: pkg.description,
                        packageType: pkg.type,
                        source: pkg.type === 'promo' ? 'promo' : 'package',
                        labTest: []
                    });
                }
                packageGroups.get(pkg.id).labTest.push(asCartItem);
            });

            const restoredGroups = [...packageGroups.values()];
            setSelectedPackagesX({
                packages: restoredGroups.filter((group) => group.source === 'package'),
                promos: restoredGroups.filter((group) => group.source === 'promo'),
                labtests: restoredLabTests
            });
            setItems(transactionItems);

            setTransactionDate(moment(selectedTransaction?.transactionDate).format('MM/DD/YYYY HH:mm:ss'));
            // These totals come from the transaction's own saved values (computed server-side at
            // hold/save time), so they stay numerically correct even though the per-package discount
            // rule above can't be perfectly reconstructed.
            setSubTotal(selectedTransaction?.totalGrossSales);
            setTotal(selectedTransaction?.totalNetSales);
            const firstDiscount = selectedTransaction?.discounts?.[0];
            setAppliedDiscount(
                firstDiscount
                    ? {
                          type: firstDiscount.type,
                          value: firstDiscount.value,
                          name: firstDiscount.name,
                          memberType: firstDiscount.memberType,
                          totalDiscount: selectedTransaction?.totalDiscount
                      }
                    : null
            );

            setDrawerOpen(false);
            setIsNewTrans(true);
        }
    };

    const handleSelectDiscount = (discount) => {
        // Calculate total original price for packages and lab tests
        const totalPackageOriginalPrice = selectedPackagesX.packages.reduce(
            (acc, item) => acc + calculatePackagePrice(item).originalPrice,
            0
        );
        const totalPromoPrice = selectedPackagesX.promos.reduce(
            (acc, promoItem) => {
                const promoPrices = calculatePackagePrice(promoItem);
                return {
                    discountedPrice: acc.discountedPrice + promoPrices.discountedPrice,
                    originalPrice: acc.originalPrice + promoPrices.originalPrice
                };
            },
            { discountedPrice: 0, originalPrice: 0 }
        );
        const totalLabTestPrice = selectedPackagesX.labtests.reduce((acc, item) => acc + item.price * item.qty, 0);

        // Calculate total discount amount
        let totalAmountWDiscount = 0;
        let totalDiscount = 0;

        console.log('xxx', totalPackageOriginalPrice, totalLabTestPrice);

        if (discount?.type === 'fixed') {
            totalDiscount = discount?.value;
            totalAmountWDiscount = totalPackageOriginalPrice + totalLabTestPrice - discount?.value + totalPromoPrice?.discountedPrice;
        } else {
            totalDiscount = ((totalPackageOriginalPrice + totalLabTestPrice) * discount?.value) / 100;
            totalAmountWDiscount =
                totalPackageOriginalPrice +
                totalLabTestPrice -
                ((totalPackageOriginalPrice + totalLabTestPrice) * discount?.value) / 100 +
                totalPromoPrice?.discountedPrice;
        }

        // Calculate new total price
        const newTotal = totalPackageOriginalPrice + totalLabTestPrice + totalPromoPrice?.originalPrice;

        // Check if there's an existing discount and if the new discount is lower
        if (
            appliedDiscount?.value &&
            ((discount.type === 'percentage' && discount.value < appliedDiscount.value) ||
                (discount.type === 'fixed' && discount.value < appliedDiscount.totalDiscount))
        ) {
            alert('There is already a higher discount applied.');
            return; // Don't apply the new discount
        }

        // Update state variables
        setAppliedDiscount({
            type: discount?.type,
            value: discount?.value,
            name: discount?.name,
            totalDiscount: totalDiscount,
            ...discount
        });

        setSubTotal(newTotal);
        setTotal(totalAmountWDiscount);
        setRegularDiscount(discount?.value); // Consider if this is still necessary
        setRegularDiscountType(discount?.type);
        setRegularDiscountName(discount?.name);
        setRegularDiscountMemberType(discount?.memberType);
    };

    const handleRemoveDiscount = () => {
        setAppliedDiscount(null);
        setRegularDiscount(0);
        setRegularDiscountType(undefined);
        setRegularDiscountName(undefined);
        setRegularDiscountMemberType(undefined);
        setIsAutoAppliedDiscount(false);
        // Re-triggers the totals-recalculation effect (keyed on selectedPackagesX) now that
        // regDiscount is cleared, so `total` drops back to the undiscounted amount without
        // touching the cart items themselves.
        setSelectedPackagesX((prev) => ({ ...prev }));
    };

    const handleRemoveDiscountConfirm = () => {
        handleRemoveDiscount();
        setRemoveDiscountDialogOpen(false);
    };

    // Senior Citizen/PWD, Solo Parent, and NAAC customers get their discount auto-applied as soon
    // as they're selected - the cashier no longer has to open the discount picker manually for
    // these. A discount the cashier picked themselves is never overridden or auto-cleared: only
    // discounts this same effect applied (isAutoAppliedDiscount) are swapped/removed automatically.
    useEffect(() => {
        if (!discountsData) return;
        if (appliedDiscount && !isAutoAppliedDiscount) return;

        const customerType = customerData?.customerType;

        if (customerType === 'seniorcitizenpwd' && scPwdDiscount) {
            handleSelectDiscount(scPwdDiscount);
            setIsAutoAppliedDiscount(true);
        } else if (customerType === 'solo-parent' && soloParentDiscount) {
            handleSelectDiscount(soloParentDiscount);
            setIsAutoAppliedDiscount(true);
        } else if (customerType === 'naac' && naacDiscount) {
            handleSelectDiscount(naacDiscount);
            setIsAutoAppliedDiscount(true);
        } else if (appliedDiscount && isAutoAppliedDiscount) {
            // Customer changed to a type that no longer qualifies - drop the auto-tagged discount.
            handleRemoveDiscount();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customerData?.id, customerData?.customerType, discountsData]);

    const handleOpenDrawer = (id) => {
        setDrawerOpen(true);
        setDrawerContent(id);
    };

    const handleAddDialolgTrans = () => {
        setNewTransDialog(true);
    };

    const handleDialogClose = () => {
        setNewTransDialog(false);
    };

    const handleDialogConfirm = () => {
        // Logic to create a new transaction
        createTransactionMutation.mutate({ branchId: branch?.id });
        setNewTransDialog(false);
        setIsNewTrans(true);
        setReferenceNumber(null); // No invoice number exists yet — invoiceNumber is only issued at Pay time.
        setHoldTransactionId(null);
    };

    const handleBackPos = (param) => {
        if (param === 'success') {
            reset();
            setRequestedBy([]);
            setReferredBy([]);
            setCustomerData([]);
            setTransactionData([]);
            setHoldTransactionId(null);
            setSelectedPackages([]);
            setReferenceNumber(null);
            setAppliedDiscount(null);
            setIsAutoAppliedDiscount(false);
            setIsNewTrans(false);
            setIsPackageOrPromoAdded(false);
            setDiscountApplied(false);
            setCheckout(false);
            handleClearTransItem().then();
        } else {
            setCheckout(false);
        }
    };

    const handleSuccessTrans = (param) => {
        if (param === 'success') {
            queryClient.invalidateQueries(['transaction', sessionItems?._id, branch?.id]);
        }
    };

    const handleSelectedDataChange = (data) => {
        console.log('data', data);
        setCustomerData(data);
    };

    useHotkeys('f1', handleAddDialolgTrans, { preventDefault: true });
    useHotkeys('f2', () => setAddCustomerModalOpen(true), { preventDefault: true });
    useHotkeys('f3', () => setAddDoctorModalOpen(true), { preventDefault: true });
    useHotkeys('f4', () => handleOpenDrawer('history'), { preventDefault: true });
    useHotkeys('f5', () => handleOpenDrawer('services'), { preventDefault: true });
    useHotkeys('f6', () => handleOpenDrawer('dreport'), { preventDefault: true });
    // Mirrors the Settle Payment button's own disabled condition below — a customer/patient must be
    // selected and the cart can't be empty. react-hotkeys-hook ignores this while focus is in a
    // form field (search boxes, dialogs), so it can't interfere with typing a literal space.
    const canCheckout =
        !!customerData?.name &&
        !(
            selectedPackagesX?.packages?.length === 0 &&
            selectedPackagesX?.promos?.length === 0 &&
            selectedPackagesX?.labtests?.length === 0
        );
    useHotkeys('space', () => canCheckout && setCheckout(true), { preventDefault: true }, [canCheckout]);

    // Compact label/value pair for the bottom summary bar. `gridColumn` lets a specific field
    // (e.g. Customer Name) span extra grid columns instead of the default single-column width.
    const renderInlineItem = (label, value, highlight = false, gridColumn) => (
        <Box sx={{ minWidth: 0, ...(gridColumn ? { gridColumn } : {}) }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} letterSpacing={0.3} noWrap display="block">
                {label}
            </Typography>
            <Typography variant="body2" fontWeight={600} sx={{ wordBreak: 'break-word', ...(highlight ? { color: 'success.dark' } : {}) }}>
                {value}
            </Typography>
        </Box>
    );

    const theme = useTheme();
    const smallScreenSize = useMediaQuery(theme.breakpoints.down('xl'));

    // Separate doctors into members and non-members
    const members = combinedDoctorData.filter((doctor) => doctor.isMember);
    const nonMembers = combinedDoctorData.filter((doctor) => !doctor.isMember);

    // Combine them into a single array with a type property
    const optionsD = [
        ...nonMembers.map((doctor) => ({ ...doctor, type: 'Non-Members' })),
        ...members.map((doctor) => ({ ...doctor, type: 'Members' }))
    ];

    const combinedDataX = [...selectedPackagesX.packages, ...selectedPackagesX.promos, ...selectedPackagesX.labtests];

    // Live preview of the same VAT rule the backend applies (Transaction.py: vatAmount/
    // _computeVatSplit) - a qualified senior/PWD/NAAC/solo-parent discount makes the whole sale
    // VAT-exempt; otherwise each item's own `vatExempt` flag decides its share of `total`, and
    // only the non-exempt share is treated as VAT-inclusive with 12% backed out. This is a
    // proportional estimate for display only - the authoritative figure is computed server-side
    // per package/promo bucket and is what actually prints on the receipt.
    const cartItemsForVat = [
        ...selectedPackagesX.packages.flatMap((p) => p.labTest || []),
        ...selectedPackagesX.promos.flatMap((p) => p.labTest || []),
        ...selectedPackagesX.labtests
    ];
    const cartGrossForVat = cartItemsForVat.reduce((sum, i) => sum + (i.price || 0), 0);
    const cartVatableGross = cartItemsForVat.reduce((sum, i) => sum + (i.vatExempt === false ? i.price || 0 : 0), 0);
    const vatableShare = cartGrossForVat ? cartVatableGross / cartGrossForVat : 0;
    const taxAmount = appliedDiscount?.memberType ? 0 : total * vatableShare - (total * vatableShare) / 1.12;

    const combinedData = {
        id: transactionData?.id,
        holdTransactionId,
        invoiceNumber: transactionData?.invoiceNumber,
        customerData: customerData,
        requestedById: requestedBy.id,
        requestedByName: requestedBy.name,
        referredById: referredBy.id,
        referredByName: referredBy.name,
        transactionNumber: transactionData?.transactionNo,
        transactionDate: transactionData?.transactionDate,
        cashierId: sessionItems?._id,
        cashierName: `${sessionItems?.firstName} ${sessionItems?.lastName}`,
        branchName: branch?.name,
        branchTIN: branch?.tin,
        branchAddress: `${branch?.streetAddress} ${branch?.state}`,
        discountApplied: appliedDiscount,
        promoDiscount: selectedPackagesX.promos[0]?.discount?.value || 0,
        subTotal: subTotal,
        paymentDue: total,
        items: combinedDataX
    };

    if (checkout) {
        return <Checkout combinedData={combinedData} handleBack={handleBackPos} handleSuccessTrans={handleSuccessTrans} />;
    }

    if (ifLogout) {
        return <CashRegister isEndingBalanceFlag={ifLogout} handleBack={() => setIfLogout(false)} />;
    }

    return (
        <Box bgcolor={theme.palette.primary.light} sx={{ p: 2.5, pb: 1, height: '100dvh' }}>
            <Grid container spacing={1.5} sx={{ height: '100%', zoom: smallScreenSize ? '70%' : '100%' }}>
                <Grid item xs={2.5} sx={{ overflow: 'hidden' }}>
                    <Stack direction="column" spacing={1.5} sx={{ height: '100%' }}>
                        <Card sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Stack>
                                <Typography variant="h4">{`${sessionItems?.firstName} ${sessionItems?.lastName}`}</Typography>
                                <Typography variant="h5" fontWeight="regular" color="text.secondary">
                                    Cashier
                                </Typography>
                            </Stack>
                            <Tooltip title="Go To Dashboard">
                                <IconButton>
                                    <TiHome onClick={() => navigate('/dashboard/home')} />
                                </IconButton>
                            </Tooltip>
                        </Card>
                        <Card sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Stack sx={{ opacity: isReportRefetching ? 0.5 : 1 }} justifyContent="center" flex={1}>
                                <Typography variant="subtitle2" color="text.secondary" fontWeight={600} letterSpacing={0.5}>
                                    DRAWER BALANCE
                                </Typography>
                                <Typography variant="h1" fontWeight="bold">
                                    <FaPesoSign style={{ fontSize: '0.85rem' }} />
                                    {getDrawerBalance() !== undefined
                                        ? new Intl.NumberFormat().format(parseFloat(getDrawerBalance()))
                                        : '0.00'}
                                </Typography>
                            </Stack>
                            {isReportRefetching ? (
                                <CircularProgress size="2rem" />
                            ) : (
                                <Tooltip title="Time Out">
                                    <IconButton>
                                        <BiSolidExit onClick={() => setIfLogout(true)} />
                                    </IconButton>
                                </Tooltip>
                            )}
                        </Card>
                        <Card sx={{ p: 3 }}>
                            <Stack direction="column" spacing={1.8}>
                                <Typography variant="h4">Customer / Patient</Typography>
                                <CusCorSelect
                                    name="selection"
                                    control={control}
                                    isNewTrans={isNewTrans}
                                    onSelectedDataChange={handleSelectedDataChange}
                                    customerData={customerData}
                                    label="Search Patient"
                                />
                                {/* {customerData?.customerType === 'corporate' && (
                  <Controller
                    name="employee"
                    control={control}
                    disabled={!isNewTrans}
                    render={({ field }) => (
                      <Autocomplete
                        {...field}
                        blurOnSelect
                        options={combinedCustomerData}
                        getOptionLabel={(option) => option.fullName}
                        onChange={(e, value) => {
                          field.onChange(value); // Update react-hook-form
                          setEmployeeData({
                            id: value?.id,
                            name: value?.fullName,
                            address: value?.address,
                            contactNumber: value?.contactNumber
                          });
                        }}
                        value={
                          field.value ||
                          combinedCustomerData.find((customer) => customer.id === customerData.id) ||
                          null
                        } // Use field.value or find the customer by ID
                        renderInput={(params) => (
                          <TextField {...params} label="Search employee" variant="outlined" fullWidth />
                        )}
                      />
                    )}
                  />
                )} */}
                                <Controller
                                    name="requestedBy"
                                    control={control}
                                    render={({ field }) => (
                                        <Autocomplete
                                            {...field}
                                            blurOnSelect
                                            options={combinedDoctorData.filter((doctor) => doctor.isMember === true)}
                                            getOptionLabel={(option) => option.fullName}
                                            onChange={(e, value) => {
                                                field.onChange(value); // Update react-hook-form
                                                setRequestedBy({ id: value?.id, name: value?.fullName }); // Update customer data
                                            }}
                                            value={
                                                field.value || combinedDoctorData.find((doctor) => doctor.id === requestedBy?.id) || null
                                            } // Use field.value or find the doctor by ID
                                            disabled={!isNewTrans}
                                            renderInput={(params) => (
                                                <TextField {...params} label="Requested By" variant="outlined" fullWidth />
                                            )}
                                        />
                                    )}
                                />
                                <Controller
                                    name="referredBy"
                                    control={control}
                                    render={({ field }) => (
                                        <Autocomplete
                                            {...field}
                                            blurOnSelect
                                            options={optionsD}
                                            getOptionLabel={(option) => option.fullName}
                                            onChange={(e, value) => {
                                                field.onChange(value); // Update react-hook-form
                                                setReferredBy({ id: value?.id, name: value?.fullName }); // Update customer data
                                            }}
                                            value={field.value || combinedDoctorData.find((doctor) => doctor.id === referredBy?.id) || null} // Use field.value or find the doctor by ID
                                            disabled={!isNewTrans}
                                            groupBy={(option) => option.type} // Group by the type added
                                            renderInput={(params) => (
                                                <TextField {...params} label="Referred By" variant="outlined" fullWidth />
                                            )}
                                        />
                                    )}
                                />
                            </Stack>
                        </Card>
                        <Card sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <Typography mb={1} variant="h4">
                                POS Actions &amp; Shortcuts
                            </Typography>
                            <Grid container spacing={0.5}>
                                {[
                                    { label: 'New Trans (F1)', icon: <MdAdd />, onclick: handleAddDialolgTrans },
                                    // { label: 'Hold (F3)', icon: <MdFrontHand />, onclick: handleHoldTransaction },
                                    { label: 'New Cust (F2)', icon: <MdPersonAdd />, onclick: () => setAddCustomerModalOpen(true) },
                                    { label: 'New Doctor (F3)', icon: <MdPersonAdd />, onclick: () => setAddDoctorModalOpen(true) },
                                    { label: 'History (F4)', icon: <MdHistory />, onclick: () => handleOpenDrawer('history') },
                                    { label: 'Services (F5)', icon: <MdList />, onclick: () => handleOpenDrawer('services') },
                                    { label: 'Report (F6)', icon: <MdList />, onclick: () => handleOpenDrawer('dreport') }
                                ]?.map((item) => {
                                    return (
                                        <Grid item xs={item?.grid ?? 12} lg={6}>
                                            <Button
                                                variant="contained"
                                                color="dark"
                                                fullWidth
                                                startIcon={item.icon}
                                                sx={{
                                                    py: 2,
                                                    height: '100%',
                                                    textWrap: 'nowrap',
                                                    overflow: 'hidden'
                                                }}
                                                onClick={item.onclick}
                                            >
                                                {item.label}
                                            </Button>
                                        </Grid>
                                    );
                                })}
                                <Grid item xs={12} lg={6}>
                                    <DiscountComponent
                                        disabled={!customerData?.name}
                                        onSelectDiscount={handleSelectDiscount}
                                        discountsData={discountsData}
                                        isDiscountApplied={!!appliedDiscount}
                                        onRemoveDiscount={() => setRemoveDiscountDialogOpen(true)}
                                    />
                                </Grid>
                                <Grid item xs={12} lg={6}>
                                    <HoldItems
                                        transaction={combinedData}
                                        onSuccess={() => handleBackPos('success')}
                                        disabled={!customerData?.name || totalItems === 0}
                                    />
                                </Grid>
                            </Grid>
                            <div style={{ flex: 1 }}></div>
                            <Stack direction="row" spacing={0.75} alignItems="center">
                                <Box
                                    sx={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        bgcolor: printerStatus === 'OPEN' ? 'success.main' : 'error.main'
                                    }}
                                />
                                <Typography variant="h5" fontWeight="regular">
                                    Thermal Printer: {printerStatus}
                                </Typography>
                            </Stack>
                        </Card>
                    </Stack>
                </Grid>
                <Grid item xs={6.5} sx={{ overflow: 'hidden', height: '100%' }}>
                    <Stack direction="column" spacing={1.5} width="100%" height="100%">
                        <Card sx={{ px: 3, py: 2 }}>
                            <PackagesComponent
                                customer={customerData}
                                disabled={!customerData?.name}
                                selectedPackages={selectedPackages}
                                handleAddItem={handleAddItem}
                                setIsPackageOrPromoAdded={setIsPackageOrPromoAdded}
                                hideTitle
                            />
                        </Card>
                        <Card sx={{ p: 3, maxHeight: '36%', overflowY: 'auto', flexShrink: 0 }}>
                            <Typography variant="h4">Diagnostics &amp; Clinical Procedures</Typography>
                            <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
                                Click pill to append to invoice
                            </Typography>
                            <LabTestComponent
                                packageTests={selectedPackagesX.packages}
                                selectedLabTest={selectedPackagesX.labtests}
                                handleAddItem={handleAddItem}
                                disabled={!customerData?.name}
                                hideTitle
                            />
                        </Card>
                        <Card
                            sx={{
                                flex: 1,
                                p: 3,
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden'
                            }}
                        >
                            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    <Typography variant="h4">Transaction Items</Typography>
                                    <Chip
                                        size="small"
                                        color="primary"
                                        variant="outlined"
                                        label={`${totalItems} item${totalItems === 1 ? '' : 's'} added`}
                                    />
                                </Stack>
                                <Button variant="outlined" color="error" onClick={() => handleClearTransItem()}>
                                    Clear
                                </Button>
                            </Stack>
                            <TableContainer
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    flex: 1,
                                    flexBasis: 0.75,
                                    opacity:
                                        selectedPackagesX?.packages?.length === 0 &&
                                        selectedPackagesX?.promos?.length === 0 &&
                                        selectedPackagesX?.labtests?.length === 0
                                            ? 0.5
                                            : 1,
                                    mt: 2,
                                    gap: 2
                                }}
                            >
                                {selectedPackagesX?.packages?.length === 0 &&
                                    selectedPackagesX?.promos?.length === 0 &&
                                    selectedPackagesX?.labtests?.length === 0 && (
                                        <Table>
                                            <TableHead>
                                                <TableRow
                                                    sx={{
                                                        '& .MuiTableCell-root': {
                                                            py: 2,
                                                            border: 1,
                                                            borderColor: theme.palette.grey[200]
                                                        }
                                                    }}
                                                >
                                                    <TableCell sx={{ width: '40%' }}>Name</TableCell>
                                                    <TableCell>Price</TableCell>
                                                    <TableCell align="center">Qty</TableCell>
                                                    <TableCell>Amount</TableCell>
                                                    <TableCell sx={{ width: 0 }} align="center"></TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                <TableRow>
                                                    <TableCell colSpan={5} align="center">
                                                        No items added yet
                                                    </TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    )}
                                {selectedPackagesX?.packages?.length !== 0 && (
                                    <PackageContainer items={selectedPackagesX.packages} onRemoveItem={handleRemovePackageItem} />
                                )}
                                {selectedPackagesX?.promos?.length !== 0 && (
                                    <PromoContainer items={selectedPackagesX.promos} onRemoveItem={handleRemovePromoItem} />
                                )}
                                {selectedPackagesX?.labtests?.length !== 0 && (
                                    <LabTestContainer
                                        items={selectedPackagesX.labtests}
                                        onRemoveItem={handleRemoveLabTestItem}
                                        regDiscount={regDiscount}
                                        regDiscountType={regDiscountType}
                                    />
                                )}
                            </TableContainer>
                        </Card>
                    </Stack>
                </Grid>

                <Grid item xs={3} sx={{ overflow: 'hidden', height: '100%' }}>
                    <Card sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
                        <Typography variant="h4" mb={2}>
                            Order Summary
                        </Typography>
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                                columnGap: 2,
                                rowGap: 1.5,
                                ...(!customerData?.name ||
                                (selectedPackagesX?.packages?.length === 0 &&
                                    selectedPackagesX?.promos?.length === 0 &&
                                    selectedPackagesX?.labtests?.length === 0)
                                    ? { opacity: 0.5 }
                                    : {})
                            }}
                        >
                            {renderInlineItem(
                                'Invoice No.',
                                referenceNumber ?? (
                                    <Box component="span" sx={{ color: 'text.disabled', fontStyle: 'italic', fontWeight: 400 }}>
                                        Auto-generated
                                    </Box>
                                )
                            )}
                            {renderInlineItem('Date', transactionDate)}
                            {renderInlineItem(
                                'Status',
                                <Chip size="small" sx={{ backgroundColor: 'success.light', color: 'green' }} label="Active" />
                            )}
                            {renderInlineItem('Customer Name', customerData?.name ?? '---', false, 'span 2')}
                            {renderInlineItem('Mobile No.', customerData?.contactNumber ?? '---')}
                            {renderInlineItem('TIN No.', customerData?.tin ?? '---')}
                            {customerData?.type === 'customer' && (
                                <>
                                    {renderInlineItem('Age', customerData?.age ?? '---')}
                                    {renderInlineItem('Birth Date', customerData?.birthDate ?? '---')}
                                </>
                            )}
                            {renderInlineItem('Requested By', requestedBy?.name ?? '---')}
                            {renderInlineItem('Referred By', referredBy?.name ?? '---')}
                            {renderInlineItem(
                                'Discount Applied',
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <span>
                                        {(appliedDiscount?.value || 0).toFixed(2)} (
                                        {appliedDiscount?.type === 'package' || appliedDiscount?.type === 'percentage' ? '%' : 'Fixed'})
                                    </span>
                                    {appliedDiscount && (
                                        <Typography
                                            component="span"
                                            variant="caption"
                                            fontWeight={600}
                                            onClick={() => setRemoveDiscountDialogOpen(true)}
                                            sx={{ cursor: 'pointer', color: 'error.main', textDecoration: 'underline' }}
                                        >
                                            Remove
                                        </Typography>
                                    )}
                                </Stack>,
                                true
                            )}
                            {renderInlineItem(
                                'Discount Total',
                                <>
                                    - <FaPesoSign style={{ marginLeft: '3px', fontSize: '0.85rem' }} />
                                    {new Intl.NumberFormat().format(appliedDiscount?.totalDiscount || 0)}
                                </>,
                                true
                            )}
                            {renderInlineItem(
                                'Promo Discount',
                                <>
                                    - <FaPesoSign style={{ marginLeft: '3px', fontSize: '0.85rem' }} />
                                    {new Intl.NumberFormat().format(selectedPackagesX.promos[0]?.discount?.value || 0)}
                                </>,
                                true
                            )}
                            {renderInlineItem('Total Items', `(${totalItems})`)}
                            {renderInlineItem(
                                'Subtotal',
                                <>
                                    <FaPesoSign style={{ marginLeft: '6px', fontSize: '0.85rem' }} />
                                    {subTotal?.toFixed(2)}
                                </>
                            )}
                            {renderInlineItem(
                                'Tax',
                                <>
                                    <FaPesoSign style={{ marginLeft: '6px', fontSize: '0.85rem' }} />
                                    {taxAmount.toFixed(2)}
                                </>
                            )}
                        </Box>
                        <Box flex={1} />
                        <Divider sx={{ my: 2 }} />
                        <Box>
                            <Typography variant="subtitle2" color="text.secondary" fontWeight={600} letterSpacing={0.5} noWrap>
                                TOTAL PAYABLE
                            </Typography>
                            <Typography variant="h2" color="primary.main" fontWeight="bold" noWrap>
                                <FaPesoSign style={{ fontSize: '0.7em' }} />
                                {total?.toFixed(2)}
                            </Typography>
                        </Box>
                        <Button
                            fullWidth
                            sx={{ py: 1.5, mt: 2 }}
                            variant="contained"
                            size="large"
                            disabled={!canCheckout}
                            onClick={() => setCheckout(true)}
                        >
                            Settle Payment (Space)
                        </Button>
                    </Card>
                </Grid>
            </Grid>

            <AddCustomerModal
                open={addCustomerModalOpen}
                onClose={() => setAddCustomerModalOpen(false)}
                // onAddCustomer={handleAddCustomer}
            />
            <AddDoctorModal open={addDoctorModalOpen} onClose={() => setAddDoctorModalOpen(false)}></AddDoctorModal>
            <RightDrawer open={drawerOpen} setOpen={setDrawerOpen}>
                {drawerContent === 'history' && <TransactionsSlideBar onRestoreTransaction={handleRestoreTransaction} />}
                {drawerContent === 'services' && <ServicesPage mode="view" />}
                {drawerContent === 'dreport' && <DailyReport cashierId={sessionItems?._id} branchId={branch?.id} />}
            </RightDrawer>

            <NewTransactionDialog open={openNewTransDialog} handleClose={handleDialogClose} handleConfirm={handleDialogConfirm} />
            <RemoveDiscountDialog
                open={removeDiscountDialogOpen}
                handleClose={() => setRemoveDiscountDialogOpen(false)}
                handleConfirm={handleRemoveDiscountConfirm}
            />
        </Box>
    );
};

export default PosComponent;
